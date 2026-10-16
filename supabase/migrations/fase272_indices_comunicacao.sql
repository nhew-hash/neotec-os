-- Fase 272 — Comunicação mais rápida: índices para as consultas que rodam o tempo todo.
-- Só acrescenta índices (nenhum dado muda).
-- Reverter:
--   drop index if exists idx_crm_followups_cliente_pendente;
--   drop index if exists idx_whatsapp_conversas_ultima;
--   drop index if exists idx_whatsapp_conversas_nao_lidas;
create index if not exists idx_crm_followups_cliente_pendente on crm_followups(cliente_id) where status = 'pendente'; -- painel do cliente
create index if not exists idx_whatsapp_conversas_ultima on whatsapp_conversas(ultima_mensagem_em desc nulls last); -- lista de conversas
create index if not exists idx_whatsapp_conversas_nao_lidas on whatsapp_conversas(id) where nao_lidas > 0; -- contador do menu
