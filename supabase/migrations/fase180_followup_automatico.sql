-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 180 (Supabase / PostgreSQL)
-- Follow-up automático — quando um card fica parado numa etapa por
-- tempo demais sem ninguém mexer, gera um lembrete sozinho. Cada
-- etapa tem seu próprio limite de dias (Lead pode esperar menos que
-- Negociação, por exemplo).
-- ============================================================================

alter table crm_etapas add column if not exists dias_para_alerta integer;

comment on column crm_etapas.dias_para_alerta is 'Card parado nessa etapa por mais que esse tanto de dias gera um follow-up automático. Null = nunca gera alerta automático pra essa etapa.';

update crm_etapas set dias_para_alerta = 2 where nome = 'Lead' and tipo = 'venda' and dias_para_alerta is null;
update crm_etapas set dias_para_alerta = 3 where nome = 'Em atendimento' and tipo = 'venda' and dias_para_alerta is null;
update crm_etapas set dias_para_alerta = 2 where nome = 'Em negociação' and tipo = 'venda' and dias_para_alerta is null;
update crm_etapas set dias_para_alerta = 3 where nome = 'Orçamento' and tipo = 'venda' and dias_para_alerta is null;
-- "Venda feita", "Pós-venda", "Oportunidades futuras" e "Atendimento
-- encerrado" ficam sem alerta automático (null) — não fazem sentido
-- de cobrar resposta rápida do mesmo jeito que um lead quente.

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 180
-- ============================================================================
