-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 10 (Supabase / PostgreSQL)
-- Conteúdo: remove o funil antigo (`conversas.etapa_funil`), consolidado
-- de vez no Pipeline configurável (`crm_cards`/`crm_etapas`, Fase 9).
--
-- DECISÃO: dois funis paralelos geravam confusão real de uso (o "CRM"
-- antigo parecia parado porque a automação de mensagens passou a
-- alimentar só o Pipeline). Decisão consciente do dono do produto:
-- apagar o funil antigo, não só aposentar. `conversas` continua
-- existindo — ainda é usada na aba "Conversas" do Cliente 360° e não
-- tem nenhuma outra dependência do campo removido.
-- ============================================================================

alter table conversas drop column if exists etapa_funil;
drop type if exists etapa_funil;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 10
-- ============================================================================
