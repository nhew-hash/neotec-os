-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 150 (Supabase / PostgreSQL)
-- Número de WhatsApp da equipe/dono, pra receber aviso automático
-- toda vez que entrar um pedido novo (checkout online) ou uma
-- avaliação de troca (trade-in) — nunca existiu essa notificação
-- interna antes, só pro cliente.
-- ============================================================================

alter table configuracoes_precificacao add column if not exists whatsapp_notificacao_staff text;

comment on column configuracoes_precificacao.whatsapp_notificacao_staff is 'Número de WhatsApp (com DDD, sem +55) que recebe aviso automático de pedido novo e trade-in. Null = notificação desligada.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 150
-- ============================================================================
