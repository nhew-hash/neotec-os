-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 261 (Supabase / PostgreSQL)
-- NEO PERFORMANCE — Central de Oportunidades (Seção 41) + ajustes de flags
-- da fase260 (criativos/automação já têm código de verdade).
-- ============================================================================

create table if not exists oportunidades (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  titulo text not null,
  origem text not null, -- de onde veio: 'diagnostico', 'estoque', 'manual', etc.
  evidencias text,
  produto text,
  publico text,
  potencial text, -- texto livre (ex: "alto", "médio") — Seção 41 não define escala fixa
  status text not null default 'descoberta' check (status in ('descoberta', 'analisando', 'aprovada', 'testando', 'validada', 'descartada')),
  campanha_relacionada_id uuid references ads_campanhas(id) on delete set null,
  teste_id uuid references test_lab_testes(id) on delete set null,
  resultado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_oportunidades_status on oportunidades(status);

create trigger trg_oportunidades_updated_at
  before update on oportunidades
  for each row execute function set_updated_at();

alter table oportunidades enable row level security;
create policy "oportunidades_admin_gerente" on oportunidades for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 261
-- ============================================================================
