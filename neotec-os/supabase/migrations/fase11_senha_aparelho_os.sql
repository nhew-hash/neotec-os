-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 11 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: campo real para a senha/PIN do aparelho na OS.
--
-- Até aqui só existia `senha_informada` (boolean — "o cliente informou
-- senha? sim/não"). Faltava o campo pra guardar a senha/PIN em si, pro
-- técnico conseguir testar o aparelho. Dado sensível — a RLS de
-- checklist_os já restringe a leitura a admin/gerente/técnico da própria
-- loja (Fase 5), o que é o controle de acesso apropriado aqui: só quem
-- mexe fisicamente no aparelho precisa ver.
-- ============================================================================

alter table checklist_os
  add column if not exists senha_valor text;

comment on column checklist_os.senha_valor is
  'Senha/PIN do aparelho informado pelo cliente no recebimento. Dado sensível — acesso já restrito por RLS a admin/gerente/técnico.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 11
-- ============================================================================
