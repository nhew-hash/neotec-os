-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 89 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: cada APARELHO (unidade individual) ganha seu
-- próprio controle de "publicado na loja virtual" — antes, a
-- visibilidade de um aparelho na loja dependia só do produto genérico
-- (`produtos.visivel_loja`), então não dava pra escolher "esse iPhone
-- específico fica só na loja física, aquele outro vai pra loja
-- virtual" — agora dá.
--
-- Compatibilidade: todo aparelho cujo produto já estava publicado
-- (`visivel_loja = true`) nasce com `disponivel_loja_virtual = true`
-- também — ninguém que já estava na loja online some com essa migração.
-- ============================================================================

alter table aparelhos add column if not exists disponivel_loja_virtual boolean not null default false;

update aparelhos a
set disponivel_loja_virtual = true
from produtos p
where p.id = a.produto_id and p.visivel_loja = true;

-- Atualiza a função pública (Fase 58/68/70) pra filtrar pelo novo
-- campo por unidade — "drop" antes é obrigatório, mesma razão da Fase
-- 70 (Postgres não deixa "create or replace function" mudar as
-- colunas de retorno de uma função "returns table(...)" já existente,
-- mas aqui a mudança é só no WHERE, então nem precisa mudar colunas de
-- retorno — ainda assim, mantido o padrão drop+create por segurança).
drop function if exists listar_aparelhos_disponiveis_loja(uuid);

create function listar_aparelhos_disponiveis_loja(p_produto_id uuid)
returns table (
  id uuid, cor text, memoria text, condicao text, bateria integer, preco_venda numeric,
  pecas_substituidas text[], observacoes text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.cor, a.memoria, a.condicao, a.bateria, a.preco_venda, a.pecas_substituidas, a.observacoes
  from aparelhos a
  join produtos p on p.id = a.produto_id
  where a.produto_id = p_produto_id and a.status = 'disponivel' and a.disponivel_loja_virtual = true;
$$;

grant execute on function listar_aparelhos_disponiveis_loja(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 89
-- ============================================================================
