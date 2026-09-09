-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 216 (Supabase / PostgreSQL)
-- Adiciona bloco de orçamento (diagnóstico + valor proposto, ANTES do
-- pagamento) no template de OS — hoje só existia bloco_pagamento
-- (preenchido só depois de finalizado). O replace() é seguro de rodar
-- de novo: se já foi trocado antes, não encontra o texto e não faz nada.
-- ============================================================================

update documento_templates
set conteudo_html = replace(
  conteudo_html,
  '{{{bloco_pagamento}}}',
  '{{{bloco_orcamento}}}

  {{{bloco_pagamento}}}'
)
where tipo_documento = 'os';

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 216
-- ============================================================================
