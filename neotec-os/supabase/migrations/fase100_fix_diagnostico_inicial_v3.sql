-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 100 (Supabase / PostgreSQL)
-- Terceira vez que "diagnostico_inicial" falta em ordens_servico (já
-- tinha sido reaplicada na Fase 56). Essa migração cobre os dois
-- motivos possíveis desse erro:
--
-- 1) A coluna genuinamente não existe nesse banco — "add column if
--    not exists" resolve.
-- 2) A coluna existe, mas o PostgREST (a camada que vira API REST em
--    cima do Postgres) está com o cache de schema desatualizado —
--    comum depois de alterar estrutura via SQL Editor. O comando
--    "NOTIFY pgrst, 'reload schema'" força ele a recarregar na hora,
--    sem precisar esperar o reload automático ou reiniciar o projeto.
-- ============================================================================

alter table ordens_servico
  add column if not exists diagnostico_inicial text;

comment on column ordens_servico.diagnostico_inicial is
  'Impressão técnica de quem recebe o aparelho na entrada — reaplicado pela 3ª vez (Fases 18, 56, 100).';

-- Força o PostgREST a recarregar o schema imediatamente — resolve o
-- caso da coluna já existir mas a API não saber disso ainda.
notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 100
-- ============================================================================
