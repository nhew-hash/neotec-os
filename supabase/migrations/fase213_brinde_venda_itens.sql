-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 213 (Supabase / PostgreSQL)
-- Brinde — item dado de graça numa venda (ex: capinha junto com o
-- iPhone). Precisa de sinalização própria: um item com valor 0 sem
-- essa marcação parece erro de digitação nos relatórios; com a
-- marcação, fica claro que foi intencional.
-- ============================================================================

alter table venda_itens add column if not exists eh_brinde boolean not null default false;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 213
-- ============================================================================
