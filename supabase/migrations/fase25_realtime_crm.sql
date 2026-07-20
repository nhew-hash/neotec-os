-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 25 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: habilita Realtime nas tabelas do CRM — é o que
-- permite o Pipeline atualizar sozinho (card novo aparecendo, follow-up
-- concluído sumindo) sem precisar recarregar a página, incluindo os
-- cards criados automaticamente pela automação de mensagem do WhatsApp.
-- ============================================================================

alter publication supabase_realtime add table crm_cards;
alter publication supabase_realtime add table crm_followups;
alter publication supabase_realtime add table retornos;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 25
-- ============================================================================
