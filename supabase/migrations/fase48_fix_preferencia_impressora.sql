-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 48 (Supabase / PostgreSQL)
-- Correção defensiva — funciona tanto se a Fase 46 já foi aplicada com
-- a constraint antiga (errada) quanto se ainda nem existe. NULL nunca é
-- considerado igual a NULL numa unique constraint comum no Postgres —
-- "unique (loja_id, usuario_id, tipo_documento)" não bloqueava duas
-- preferências "da loja inteira" (usuario_id null) pro mesmo documento.
-- ============================================================================

alter table impressora_documento_preferencia
  drop constraint if exists impressora_documento_preferencia_loja_id_usuario_id_tipo_do_key;

create unique index if not exists idx_impressora_pref_usuario_unico
  on impressora_documento_preferencia(loja_id, usuario_id, tipo_documento)
  where usuario_id is not null;

create unique index if not exists idx_impressora_pref_loja_unico
  on impressora_documento_preferencia(loja_id, tipo_documento)
  where usuario_id is null;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 48
-- ============================================================================
