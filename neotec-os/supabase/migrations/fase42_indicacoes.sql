-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 42 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: módulo de Indicações — pessoas (não necessariamente
-- clientes da loja) que indicam gente pra Neotec recorrentemente, com
-- saldo (crédito/retirada). Mesmo padrão já usado em Investidores
-- (Fase 7) e Cashback — ledger de movimentos, saldo é sempre calculado
-- pela soma, nunca guardado como número fixo.
-- ============================================================================

create table indicadores (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_indicadores_updated_at
  before update on indicadores
  for each row execute function set_updated_at();

create type tipo_movimento_indicador as enum ('credito', 'retirada');

create table indicador_movimentos (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references indicadores(id) on delete cascade,
  tipo tipo_movimento_indicador not null,
  valor numeric(12,2) not null check (valor > 0),
  motivo text,
  usuario_id uuid references usuarios(id),
  data timestamptz not null default now()
);

create index idx_indicador_movimentos_indicador on indicador_movimentos(indicador_id);

-- Campo de indicação na Ordem de Serviço — quem indicou esse cliente,
-- se foi o caso. Nullable: a maioria das OS não vem de indicação.
alter table ordens_servico
  add column if not exists indicador_id uuid references indicadores(id);

alter table indicadores enable row level security;
alter table indicador_movimentos enable row level security;

create policy "indicadores_staff_all" on indicadores for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());

create policy "indicador_movimentos_staff_all" on indicador_movimentos for all
  using (
    exists (select 1 from indicadores i where i.id = indicador_movimentos.indicador_id and i.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

alter publication supabase_realtime add table indicadores;
alter publication supabase_realtime add table indicador_movimentos;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 42
-- ============================================================================
