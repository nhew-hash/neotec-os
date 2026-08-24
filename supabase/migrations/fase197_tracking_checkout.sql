-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 197 (Supabase / PostgreSQL)
-- Rastreamento do funil de checkout — reaproveita a infraestrutura de
-- eventos já existente (loja_eventos, Fase 183), só adiciona os tipos
-- novos que faltavam pra conseguir medir ONDE o cliente desiste.
-- ============================================================================

alter type tipo_evento_loja add value if not exists 'checkout_view';
alter type tipo_evento_loja add value if not exists 'checkout_started';
alter type tipo_evento_loja add value if not exists 'payment_selected';
alter type tipo_evento_loja add value if not exists 'payment_success';
alter type tipo_evento_loja add value if not exists 'payment_failed';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 197
-- ============================================================================
