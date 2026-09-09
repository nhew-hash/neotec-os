-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 106 (Supabase / PostgreSQL)
-- Terceira reaplicação da Fase 18 (já tinha sido reaplicada na Fase
-- 56 e na Fase 100) — agora com confirmação clara: `estoque_minimo`
-- também estava faltando, e as duas colunas (`diagnostico_inicial` e
-- `estoque_minimo`) nasceram na MESMA migração original (Fase 18).
-- Isso confirma que esse banco nunca rodou a Fase 18/56 de verdade —
-- não é cache de schema, é migração pulada mesmo.
--
-- Reaplica tudo de novo, incluindo a view e o reload de schema, tudo
-- idempotente (seguro rodar quantas vezes precisar).
-- ============================================================================

alter table ordens_servico
  add column if not exists diagnostico_inicial text;

comment on column ordens_servico.diagnostico_inicial is
  'Impressão técnica de quem recebe o aparelho, capturada na abertura da OS — diferente de `defeito` (relato do cliente) e de `diagnostico` (avaliação técnica após abrir o aparelho).';

alter table produtos
  add column if not exists estoque_minimo integer not null default 0;

drop view if exists vw_produtos_seguro;
create view vw_produtos_seguro as
select
  id, categoria, marca, modelo, nome, descricao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  estoque_minimo,
  status, created_at, updated_at
from produtos;

grant select on vw_produtos_seguro to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 106
-- ============================================================================
