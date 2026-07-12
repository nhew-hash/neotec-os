-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 4 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: campos do Cliente 360°.
-- ============================================================================

alter table clientes
  add column if not exists apple_id text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists aceita_marketing boolean not null default false;

-- data_nascimento já existia desde a Fase 1 (campo "nascimento" do Cliente 360°).
-- Índice para a consulta de "próximos aniversários" do dashboard, que filtra
-- por mês/dia, não pela data completa.
create index if not exists idx_clientes_aniversario
  on clientes (extract(month from data_nascimento), extract(day from data_nascimento));

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 4
-- ============================================================================
