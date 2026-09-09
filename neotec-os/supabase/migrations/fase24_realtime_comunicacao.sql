-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 24 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: habilita Realtime em conversas e mensagens do
-- WhatsApp — é o que permite a tela de Comunicação atualizar sozinha
-- (mensagem nova aparecendo, contador de não lidas mudando) sem precisar
-- recarregar a página.
-- ============================================================================

alter publication supabase_realtime add table whatsapp_conversas;
alter publication supabase_realtime add table whatsapp_mensagens;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 24
-- ============================================================================
