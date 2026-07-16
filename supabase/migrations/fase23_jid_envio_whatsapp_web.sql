-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 23 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: JID de envio direto pra conversas do WhatsApp Web.
--
-- O WhatsApp está migrando parte das contas pra um identificador interno
-- ("LID"), diferente do número de telefone. Pra essas contas, às vezes
-- não tem como descobrir o número de telefone real — mas dá pra
-- responder mesmo assim, mandando direto pro identificador que a própria
-- mensagem trouxe (LID ou telefone, o que tiver). `jid_envio` guarda
-- isso; `telefone` continua servindo só pra exibição e pra achar/criar
-- cliente (formato local, sem "55", como sempre foi).
-- ============================================================================

alter table whatsapp_conversas
  add column if not exists jid_envio text;

comment on column whatsapp_conversas.jid_envio is
  'JID completo do WhatsApp (com @lid ou @s.whatsapp.net) pra responder direto — usado quando o telefone real não está disponível (contas migradas pra LID). Só relevante pro provider whatsapp_web.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 23
-- ============================================================================
