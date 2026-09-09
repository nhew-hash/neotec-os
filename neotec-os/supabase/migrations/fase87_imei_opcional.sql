-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 87 (Supabase / PostgreSQL)
-- IMEI deixa de ser obrigatório em `aparelhos` — no cadastro em lote
-- via fornecedor (Central de Cadastro, Fase 83), o IMEI muitas vezes
-- só é conhecido quando o aparelho chega fisicamente na loja, não na
-- hora de registrar a lista de preço. A constraint UNIQUE continua
-- intacta e funciona normalmente com múltiplos NULLs — no Postgres,
-- NULL nunca é considerado igual a outro NULL numa unique constraint,
-- então vários aparelhos sem IMEI ainda coexistem sem conflito; só não
-- deixa dois aparelhos terem o MESMO IMEI preenchido.
-- ============================================================================

alter table aparelhos alter column imei drop not null;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 87
-- ============================================================================
