-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 258 (Supabase / PostgreSQL)
-- Permitir excluir um card do CRM (Pipeline) definitivamente.
--
-- Hoje só existe "Marcar como perdido" (soft, mantém o card). O botão de
-- excluir de verdade precisa de DELETE em `crm_cards`. As tabelas filhas
-- (`crm_card_tags`, `crm_followups`, `crm_score_eventos`) já têm
-- `on delete cascade` (Fase 9/32) — não muda nada aqui.
--
-- `whatsapp_conversas.card_id` é a única referência sem `on delete`
-- definido (Fase 9), o que bloquearia o DELETE com erro de FK sempre que
-- o card tiver conversa vinculada (o caso comum). Troca pra
-- `on delete set null`: a conversa e o histórico de mensagens continuam
-- existindo normalmente, só perdem o vínculo com o card apagado — mesmo
-- padrão já usado em `ordens_servico.convertido_de_card_id`/
-- `gerou_card_venda_id` (Fase 176).
-- ============================================================================

alter table whatsapp_conversas drop constraint if exists whatsapp_conversas_card_id_fkey;
alter table whatsapp_conversas
  add constraint whatsapp_conversas_card_id_fkey
  foreign key (card_id) references crm_cards(id) on delete set null;
