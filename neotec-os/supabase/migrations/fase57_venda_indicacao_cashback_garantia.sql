-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 57 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: venda ganha indicação (quem indicou o cliente),
-- garantia (dias, relevante principalmente pra venda de aparelho) e
-- registro de cashback usado/concedido nessa venda específica.
-- ============================================================================

alter table vendas
  add column if not exists indicador_id uuid references indicadores(id),
  add column if not exists garantia_dias integer,
  add column if not exists cashback_utilizado numeric(12,2) not null default 0,
  add column if not exists cashback_concedido numeric(12,2) not null default 0;

comment on column vendas.cashback_utilizado is
  'Valor de cashback do cliente abatido do total dessa venda — gera um movimento tipo débito em cashback na hora de finalizar.';
comment on column vendas.cashback_concedido is
  'Cashback dado ao cliente por essa compra — gera um movimento tipo crédito em cashback na hora de finalizar.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 57
-- ============================================================================
