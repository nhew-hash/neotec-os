-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 5 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: OS completa — numeração automática, prazo/urgência,
-- checklist de recebimento/entrega.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NUMERAÇÃO AUTOMÁTICA — formato OS000001
-- ----------------------------------------------------------------------------
create sequence if not exists seq_ordens_servico;

alter table ordens_servico
  add column if not exists numero_os text,
  add column if not exists prazo date,
  add column if not exists urgente boolean not null default false;

create or replace function gerar_numero_os()
returns trigger
language plpgsql
as $$
begin
  if new.numero_os is null then
    new.numero_os := 'OS' || lpad(nextval('seq_ordens_servico')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gerar_numero_os on ordens_servico;
create trigger trg_gerar_numero_os
  before insert on ordens_servico
  for each row execute function gerar_numero_os();

create unique index if not exists idx_os_numero on ordens_servico(numero_os);

-- ----------------------------------------------------------------------------
-- 2. CHECKLIST DE RECEBIMENTO E ENTREGA
-- Tabela própria (não reaproveita testes_aparelho, que é do controle de
-- qualidade de ESTOQUE — este checklist é do fluxo de OS, semântica
-- diferente: "o aparelho chegou assim" vs "o aparelho passou no teste").
-- ----------------------------------------------------------------------------
create type tipo_checklist_os as enum ('recebimento', 'entrega');

create table checklist_os (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references ordens_servico(id) on delete cascade,
  tipo tipo_checklist_os not null,
  liga boolean,
  molhado boolean,
  arranhado boolean,
  tela boolean,
  face_id boolean,
  touch boolean,
  botoes boolean,
  cameras boolean,
  biometria boolean,
  senha_informada boolean,
  observacoes text,
  responsavel_id uuid references usuarios(id),
  data_checklist timestamptz not null default now(),
  unique (os_id, tipo)
);

create index idx_checklist_os on checklist_os(os_id);

alter table checklist_os enable row level security;
create policy "checklist_os_staff_all" on checklist_os for all
  using (
    exists (
      select 1 from ordens_servico os
      where os.id = checklist_os.os_id and os.loja_id = current_user_loja_id()
    )
    and current_user_cargo() in ('admin', 'gerente', 'tecnico')
  );

-- ----------------------------------------------------------------------------
-- 3. FILA DE NOTIFICAÇÕES (camada preparada para WhatsApp — Meta Business API)
-- Nenhuma integração real acontece aqui. Cada evento do sistema grava uma
-- linha com status 'pendente'; quando a integração real for ligada, um
-- worker passa a consumir essa fila. Até lá, é só um registro auditável
-- do que "seria" enviado.
-- ----------------------------------------------------------------------------
create type evento_whatsapp as enum (
  'nova_os', 'diagnostico', 'orcamento', 'aprovacao', 'pronto',
  'venda', 'garantia', 'aniversario', 'cashback', 'retorno'
);
create type status_notificacao as enum ('pendente', 'enviado', 'erro', 'desativado');

create table fila_notificacoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid references clientes(id),
  evento evento_whatsapp not null,
  telefone text not null,
  variaveis jsonb not null default '{}'::jsonb,
  status status_notificacao not null default 'desativado',
  criado_em timestamptz not null default now(),
  processado_em timestamptz
);

create index idx_fila_notificacoes_status on fila_notificacoes(status, criado_em);

alter table fila_notificacoes enable row level security;
create policy "fila_notificacoes_staff_select" on fila_notificacoes for select
  using (loja_id = current_user_loja_id());
-- Escrita só via função SECURITY DEFINER (registrar_evento_whatsapp),
-- nunca INSERT direto do app — mesmo padrão da timeline.

create or replace function registrar_evento_whatsapp(
  p_cliente_id uuid,
  p_evento evento_whatsapp,
  p_telefone text,
  p_variaveis jsonb,
  p_loja_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- status fixo 'desativado' de propósito: a integração real ainda não
  -- existe (decisão explícita da missão). Quando a API oficial da Meta
  -- for configurada, mudar o default para 'pendente' é a única alteração
  -- necessária aqui — todo o resto do sistema já estará pronto.
  insert into fila_notificacoes (loja_id, cliente_id, evento, telefone, variaveis, status)
  values (coalesce(p_loja_id, default_loja_id()), p_cliente_id, p_evento, p_telefone, p_variaveis, 'desativado');
end;
$$;

grant execute on function registrar_evento_whatsapp(uuid, evento_whatsapp, text, jsonb, uuid) to authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 5
-- ============================================================================
