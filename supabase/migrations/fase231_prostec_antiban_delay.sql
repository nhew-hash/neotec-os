-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 231 (Supabase / PostgreSQL)
-- Anti-ban da Iara: guarda o horário do último envio pra impor um
-- espaçamento mínimo (com jitter) entre mensagens de WhatsApp da Prostec,
-- evitando um padrão de disparo em rajada que pareça bot.
-- Ver src/services/prostec/whatsapp/prostec-whatsapp.provider.ts
-- ============================================================================

alter table integracoes_whatsapp_prostec
  add column if not exists ultimo_envio_em timestamptz;
