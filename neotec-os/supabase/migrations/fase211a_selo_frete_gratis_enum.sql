-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 211a (Supabase / PostgreSQL)
-- Só adiciona o valor novo do enum — precisa estar em transação
-- separada de qualquer INSERT que use esse valor (restrição do
-- Postgres: ALTER TYPE ADD VALUE não pode ser usado na mesma
-- transação em que o valor novo é referenciado).
-- ============================================================================

alter type tipo_selo_confianca add value if not exists 'frete_gratis';

notify pgrst, 'reload schema';
