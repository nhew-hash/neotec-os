-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 94 (Supabase / PostgreSQL)
-- Corrige produtos que ficaram publicados (visivel_loja = true) sem
-- slug — causa direta do link quebrado /loja/produto/null. Aconteceu
-- porque "publicar aparelho" (Fase 93) publicava o produto-pai sem
-- gerar slug; já corrigido no código, essa migração só arruma o que
-- já ficou publicado nesse estado antes da correção.
--
-- Não depende da extensão "unaccent" (pode não estar habilitada) —
-- troca as vogais acentuadas mais comuns em português manualmente
-- antes de limpar o resto.
-- ============================================================================

update produtos
set slug = lower(
  regexp_replace(
    regexp_replace(
      translate(nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )
) || '-' || substr(id::text, 1, 6)
where visivel_loja = true and slug is null;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 94
-- ============================================================================
