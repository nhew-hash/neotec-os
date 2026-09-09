-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 56 (Supabase / PostgreSQL)
-- Reaplica a Fase 18 — a coluna diagnostico_inicial não existe de
-- verdade no banco (confirmado: recarregar o cache do schema não
-- resolveu, então não era cache desatualizado, era a coluna faltando
-- mesmo). Tudo aqui usa "if not exists" — seguro rodar mesmo que parte
-- da Fase 18 já tenha sido aplicada antes.
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

-- Força o PostgREST a recarregar o schema imediatamente depois da
-- alteração — não depende de esperar o refresh automático.
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 56
-- ============================================================================
