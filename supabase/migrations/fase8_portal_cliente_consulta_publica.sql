-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 8 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Portal do Cliente (login por e-mail + senha
-- provisória) e Consulta pública de OS (sem login).
--
-- DECISÃO DE ARQUITETURA (ver ARCHITECTURE.md): login do portal é por
-- e-mail, não por CPF. CPF permanece campo cadastral. Usar CPF como
-- credencial pública tratava um dado sensível (LGPD) como se fosse um
-- identificador de login, e a base atual trata CPF como opcional — não
-- dá pra logar por um campo que pode ser nulo sem tornar CPF obrigatório
-- para todo cliente já cadastrado, o que quebraria dado existente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VÍNCULO DO CLIENTE COM O SUPABASE AUTH (conta do portal)
-- ----------------------------------------------------------------------------
alter table clientes
  add column if not exists portal_user_id uuid references auth.users(id),
  add column if not exists senha_provisoria boolean not null default false;

create unique index if not exists idx_clientes_portal_user on clientes(portal_user_id) where portal_user_id is not null;

-- Função utilitária: id do cliente dono da sessão de portal atual
create or replace function current_portal_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from clientes where portal_user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 2. RLS — cliente só enxerga o próprio dado, em modo somente-leitura
-- ----------------------------------------------------------------------------
create policy "clientes_portal_select_proprio" on clientes for select
  using (id = current_portal_cliente_id());

create policy "vendas_portal_select_proprio" on vendas for select
  using (cliente_id = current_portal_cliente_id());

create policy "os_portal_select_proprio" on ordens_servico for select
  using (cliente_id = current_portal_cliente_id());

create policy "cashback_portal_select_proprio" on cashback for select
  using (cliente_id = current_portal_cliente_id());

create policy "garantias_portal_select_proprio" on garantias for select
  using (cliente_id = current_portal_cliente_id());

create policy "timeline_portal_select_proprio" on timeline_eventos for select
  using (cliente_id = current_portal_cliente_id());

create policy "fila_notificacoes_portal_select_proprio" on fila_notificacoes for select
  using (cliente_id = current_portal_cliente_id());

-- ----------------------------------------------------------------------------
-- 3. CONSULTA PÚBLICA DE OS (sem login) — expõe só o mínimo necessário,
-- via função SECURITY DEFINER, nunca a tabela ordens_servico diretamente.
-- ----------------------------------------------------------------------------
alter table ordens_servico
  add column if not exists observacoes_publicas text;

create or replace function consultar_os_publico(p_numero_os text, p_telefone text)
returns table (
  numero_os text,
  status status_os,
  prazo date,
  valor numeric,
  observacoes_publicas text
)
language sql
stable
security definer
set search_path = public
as $$
  select os.numero_os, os.status, os.prazo, os.valor, os.observacoes_publicas
  from ordens_servico os
  join clientes c on c.id = os.cliente_id
  where os.numero_os = p_numero_os
    and c.whatsapp = regexp_replace(p_telefone, '\D', '', 'g');
$$;

-- Executável por qualquer um, inclusive sem sessão (role "anon") — é
-- exatamente o caso de uso: consulta pública, sem login.
grant execute on function consultar_os_publico(text, text) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 8
-- ============================================================================
