-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 118 (Supabase / PostgreSQL)
-- Novo tipo de documento — "comprovante de compra" específico pra
-- venda de aparelho (iPhone/Android), com campos que a nota de venda
-- genérica não tinha (IMEI, cor, armazenamento, estado lacrado/
-- seminovo, entrada/saldo, garantia detalhada, declaração de conferência).
-- ============================================================================

alter type tipo_documento_impressao add value if not exists 'comprovante_aparelho';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 118
-- ============================================================================
