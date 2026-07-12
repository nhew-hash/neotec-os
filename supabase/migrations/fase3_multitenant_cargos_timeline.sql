-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 3 (Supabase / PostgreSQL)
-- Aditivo: não remove nem recria dado existente.
-- Conteúdo: 1) multi-tenant real (RLS por loja_id), 2) novos cargos
-- (Gerente, Caixa), 3) timeline genérica do cliente.
--
-- IMPORTANTE — rodar em DUAS ETAPAS:
-- Etapa 1: rode só o bloco "1. NOVOS CARGOS" e clique em "Run".
-- Etapa 2: rode o restante do arquivo (a partir do bloco 2).
-- Motivo: o Postgres não permite usar um valor de enum recém-criado
-- (ALTER TYPE ... ADD VALUE) na mesma transação em que ele foi adicionado.
-- Rodando em duas execuções separadas no SQL Editor isso é resolvido.
-- ============================================================================


-- ============================================================================
-- 1. NOVOS CARGOS — rode este bloco sozinho primeiro
-- ============================================================================
alter type cargo_usuario add value if not exists 'gerente';
alter type cargo_usuario add value if not exists 'caixa';

-- ============================================================================
-- ⬆⬆⬆ RODE ATÉ AQUI, DEPOIS RODE O RESTANTE EM UMA SEGUNDA EXECUÇÃO ⬆⬆⬆
-- ============================================================================


-- ============================================================================
-- 2. MULTI-TENANT REAL — função utilitária de loja do usuário atual
-- ============================================================================
create or replace function current_user_loja_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select loja_id from usuarios where id = auth.uid();
$$;

-- ============================================================================
-- 3. RESTRINGIR "LOJAS" — cada usuário só vê a própria loja
-- (visão cross-loja para um futuro painel super-admin fica fora de escopo
-- desta fase — ver ARCHITECTURE.md)
-- ============================================================================
drop policy if exists "lojas_select" on lojas;
create policy "lojas_select_propria" on lojas for select
  using (id = current_user_loja_id());

-- ============================================================================
-- 4. ESCOPAR POLICIES EXISTENTES POR LOJA
-- Preserva a lógica de cargo já existente, apenas ADICIONA a condição de
-- loja_id nas tabelas que já possuem essa coluna diretamente.
-- ============================================================================

-- usuarios: admin só gerencia usuários da própria loja
drop policy if exists "usuarios_admin_all" on usuarios;
create policy "usuarios_admin_all" on usuarios for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- clientes
drop policy if exists "clientes_staff_all" on clientes;
create policy "clientes_staff_all" on clientes for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico', 'caixa')
    and loja_id = current_user_loja_id()
  );

-- conversas
drop policy if exists "conversas_staff_all" on conversas;
create policy "conversas_staff_all" on conversas for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor')
    and loja_id = current_user_loja_id()
  );

-- produtos
drop policy if exists "produtos_admin_all" on produtos;
create policy "produtos_admin_all" on produtos for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

drop policy if exists "produtos_tecnico_select" on produtos;
create policy "produtos_tecnico_select" on produtos for select
  using (current_user_cargo() = 'tecnico' and loja_id = current_user_loja_id());

-- aparelhos
drop policy if exists "aparelhos_admin_all" on aparelhos;
create policy "aparelhos_admin_all" on aparelhos for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

drop policy if exists "aparelhos_tecnico_all" on aparelhos;
create policy "aparelhos_tecnico_all" on aparelhos for all
  using (current_user_cargo() = 'tecnico' and loja_id = current_user_loja_id());

-- vendas
drop policy if exists "vendas_admin_all" on vendas;
create policy "vendas_admin_all" on vendas for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

drop policy if exists "vendas_vendedor_insert" on vendas;
create policy "vendas_vendedor_insert" on vendas for insert
  with check (
    current_user_cargo() in ('vendedor', 'caixa')
    and loja_id = current_user_loja_id()
  );

-- ordens_servico
drop policy if exists "os_staff_all" on ordens_servico;
create policy "os_staff_all" on ordens_servico for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'tecnico')
    and loja_id = current_user_loja_id()
  );

-- financeiro — admin e gerente têm acesso completo; caixa só lança e consulta
drop policy if exists "financeiro_admin_only" on financeiro;
create policy "financeiro_admin_gerente_all" on financeiro for all
  using (
    current_user_cargo() in ('admin', 'gerente')
    and loja_id = current_user_loja_id()
  );
create policy "financeiro_caixa_select_insert" on financeiro for select
  using (current_user_cargo() = 'caixa' and loja_id = current_user_loja_id());
create policy "financeiro_caixa_insert" on financeiro for insert
  with check (current_user_cargo() = 'caixa' and loja_id = current_user_loja_id());

-- tarefas_pendentes
drop policy if exists "tarefas_staff_all" on tarefas_pendentes;
create policy "tarefas_staff_all" on tarefas_pendentes for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico', 'caixa')
    and loja_id = current_user_loja_id()
  );

-- ============================================================================
-- 5. TABELAS FILHAS SEM loja_id PRÓPRIO — RLS via join com a tabela pai
-- (decisão arquitetural: não duplicar loja_id em toda tabela filha; a
-- consistência multi-tenant vem do relacionamento com a entidade dona)
-- ============================================================================

-- mensagens → via conversas
drop policy if exists "mensagens_staff_all" on mensagens;
create policy "mensagens_staff_all" on mensagens for all
  using (
    exists (
      select 1 from conversas c
      where c.id = mensagens.conversa_id
        and c.loja_id = current_user_loja_id()
    )
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

-- retornos → via clientes
drop policy if exists "retornos_staff_all" on retornos;
create policy "retornos_staff_all" on retornos for all
  using (
    exists (
      select 1 from clientes cl
      where cl.id = retornos.cliente_id
        and cl.loja_id = current_user_loja_id()
    )
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

-- venda_itens → via vendas
drop policy if exists "venda_itens_admin_all" on venda_itens;
create policy "venda_itens_admin_all" on venda_itens for all
  using (
    exists (select 1 from vendas v where v.id = venda_itens.venda_id and v.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente')
  );
drop policy if exists "venda_itens_vendedor_insert" on venda_itens;
create policy "venda_itens_vendedor_insert" on venda_itens for insert
  with check (
    exists (select 1 from vendas v where v.id = venda_itens.venda_id and v.loja_id = current_user_loja_id())
    and current_user_cargo() in ('vendedor', 'caixa')
  );

-- pecas_os → via ordens_servico
drop policy if exists "pecas_os_staff_all" on pecas_os;
create policy "pecas_os_staff_all" on pecas_os for all
  using (
    exists (select 1 from ordens_servico os where os.id = pecas_os.os_id and os.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'tecnico')
  );

-- cashback → via clientes
drop policy if exists "cashback_admin_all" on cashback;
create policy "cashback_admin_gerente_all" on cashback for all
  using (
    exists (select 1 from clientes cl where cl.id = cashback.cliente_id and cl.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente')
  );
drop policy if exists "cashback_vendedor_select" on cashback;
create policy "cashback_vendedor_select" on cashback for select
  using (
    exists (select 1 from clientes cl where cl.id = cashback.cliente_id and cl.loja_id = current_user_loja_id())
    and current_user_cargo() in ('vendedor', 'caixa')
  );

-- garantias → via clientes
drop policy if exists "garantias_staff_all" on garantias;
create policy "garantias_staff_all" on garantias for all
  using (
    exists (select 1 from clientes cl where cl.id = garantias.cliente_id and cl.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico')
  );

-- testes_aparelho → via aparelhos
drop policy if exists "testes_staff_all" on testes_aparelho;
create policy "testes_staff_all" on testes_aparelho for all
  using (
    exists (select 1 from aparelhos a where a.id = testes_aparelho.aparelho_id and a.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'tecnico')
  );

-- orcamentos / orcamento_itens → sem loja_id direto; via clientes
drop policy if exists "orcamentos_staff_all" on orcamentos;
create policy "orcamentos_staff_all" on orcamentos for all
  using (
    exists (select 1 from clientes cl where cl.id = orcamentos.cliente_id and cl.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

drop policy if exists "orcamento_itens_staff_all" on orcamento_itens;
create policy "orcamento_itens_staff_all" on orcamento_itens for all
  using (
    exists (
      select 1 from orcamentos o
      join clientes cl on cl.id = o.cliente_id
      where o.id = orcamento_itens.orcamento_id and cl.loja_id = current_user_loja_id()
    )
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

-- movimentos_estoque → via produtos OU aparelhos (um dos dois é preenchido)
drop policy if exists "movimentos_admin_tecnico_all" on movimentos_estoque;
create policy "movimentos_staff_all" on movimentos_estoque for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'tecnico')
    and (
      exists (select 1 from produtos p where p.id = movimentos_estoque.produto_id and p.loja_id = current_user_loja_id())
      or exists (select 1 from aparelhos a where a.id = movimentos_estoque.aparelho_id and a.loja_id = current_user_loja_id())
    )
  );

-- fotos: mantida como está (referência polimórfica já assumida como risco
-- documentado desde a Fase 1) — fora do escopo de isolamento por loja nesta
-- migração; ver débito técnico registrado em ARCHITECTURE.md
-- logs: mantida admin-only global por enquanto (auditoria); revisar quando
-- existir um papel de super-admin cross-loja

-- ============================================================================
-- 6. NOVOS MÓDULOS NO RBAC PARA OS CARGOS NOVOS
-- ============================================================================
insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'gerente', id, true, true, true, true from modulos
on conflict (cargo, modulo_id) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'caixa', id, true, true, false, false from modulos
where chave in ('dashboard', 'vendas', 'financeiro', 'clientes')
on conflict (cargo, modulo_id) do nothing;

-- ============================================================================
-- 7. TIMELINE GENÉRICA DO CLIENTE
-- ============================================================================
create type tipo_evento_timeline as enum (
  'venda', 'orcamento', 'ordem_servico', 'cashback', 'garantia', 'retorno', 'cliente_criado'
);

create table timeline_eventos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo_evento tipo_evento_timeline not null,
  titulo text not null,
  descricao text,
  referencia_tabela text not null,
  referencia_id uuid not null,
  usuario_id uuid references usuarios(id),
  data timestamptz not null default now()
);

create index idx_timeline_cliente on timeline_eventos(cliente_id, data desc);
create index idx_timeline_loja on timeline_eventos(loja_id);

alter table timeline_eventos enable row level security;
create policy "timeline_staff_select" on timeline_eventos for select
  using (loja_id = current_user_loja_id());
-- Escrita só acontece via trigger (SECURITY DEFINER), nunca direto do app.

-- Função central que qualquer trigger de módulo chama para gerar evento
create or replace function registrar_evento_timeline(
  p_cliente_id uuid,
  p_tipo tipo_evento_timeline,
  p_titulo text,
  p_descricao text,
  p_referencia_tabela text,
  p_referencia_id uuid,
  p_usuario_id uuid,
  p_loja_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into timeline_eventos (cliente_id, tipo_evento, titulo, descricao, referencia_tabela, referencia_id, usuario_id, loja_id)
  values (p_cliente_id, p_tipo, p_titulo, p_descricao, p_referencia_tabela, p_referencia_id, p_usuario_id, coalesce(p_loja_id, default_loja_id()));
end;
$$;

-- Trigger: nova venda concluída
create or replace function trg_fn_timeline_venda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida' then
    perform registrar_evento_timeline(
      new.cliente_id, 'venda', 'Venda realizada',
      'Valor: ' || new.valor_total::text,
      'vendas', new.id, new.usuario_id, new.loja_id
    );
  end if;
  return new;
end;
$$;

create trigger trg_timeline_venda
  after insert on vendas
  for each row execute function trg_fn_timeline_venda();

-- Trigger: OS aberta e OS entregue
create or replace function trg_fn_timeline_os()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform registrar_evento_timeline(
      new.cliente_id, 'ordem_servico', 'Ordem de serviço aberta',
      new.defeito, 'ordens_servico', new.id, new.tecnico_id, new.loja_id
    );
  elsif tg_op = 'UPDATE' and new.status = 'entregue' and old.status is distinct from 'entregue' then
    perform registrar_evento_timeline(
      new.cliente_id, 'ordem_servico', 'Aparelho entregue',
      'OS finalizada', 'ordens_servico', new.id, new.tecnico_id, new.loja_id
    );
  end if;
  return new;
end;
$$;

create trigger trg_timeline_os
  after insert or update on ordens_servico
  for each row execute function trg_fn_timeline_os();

-- Trigger: cashback
create or replace function trg_fn_timeline_cashback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
begin
  select loja_id into v_loja_id from clientes where id = new.cliente_id;
  perform registrar_evento_timeline(
    new.cliente_id, 'cashback',
    case when new.tipo = 'credito' then 'Cashback recebido' else 'Cashback utilizado' end,
    coalesce(new.origem, ''), 'cashback', new.id, null, v_loja_id
  );
  return new;
end;
$$;

create trigger trg_timeline_cashback
  after insert on cashback
  for each row execute function trg_fn_timeline_cashback();

-- Trigger: garantia gerada
create or replace function trg_fn_timeline_garantia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
begin
  select loja_id into v_loja_id from clientes where id = new.cliente_id;
  perform registrar_evento_timeline(
    new.cliente_id, 'garantia', 'Garantia gerada',
    'Válida até ' || new.fim::text, 'garantias', new.id, null, v_loja_id
  );
  return new;
end;
$$;

create trigger trg_timeline_garantia
  after insert on garantias
  for each row execute function trg_fn_timeline_garantia();

-- Trigger: cliente cadastrado (marco inicial da timeline)
create or replace function trg_fn_timeline_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform registrar_evento_timeline(
    new.id, 'cliente_criado', 'Cliente cadastrado',
    null, 'clientes', new.id, null, new.loja_id
  );
  return new;
end;
$$;

create trigger trg_timeline_cliente
  after insert on clientes
  for each row execute function trg_fn_timeline_cliente();

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 3
-- ============================================================================
