-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 68 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: pedido_loja_itens ganha uma terceira referência
-- possível — variante de lacrado (Fase 66) — além de produto_id e
-- aparelho_id que já existiam. Mesmo padrão: cada item referencia
-- exatamente UM dos três, nunca mais de um.
-- ============================================================================

alter table pedido_loja_itens
  add column if not exists lacrado_variante_id uuid references catalogo_lacrados_variantes(id);

-- Atualiza a função pública de aparelhos disponíveis (Fase 58) pra
-- incluir peças substituídas e observações — "essa informação deve
-- aparecer claramente na página do produto" (seminovos).
-- "drop" antes é obrigatório aqui — Postgres não deixa "create or
-- replace function" mudar as colunas de retorno de uma função
-- "returns table(...)" já existente (essa mudou desde a Fase 58).
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
  where a.produto_id = p_produto_id and a.status = 'disponivel' and p.visivel_loja = true;
$$;

grant execute on function listar_aparelhos_disponiveis_loja(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 68
-- ============================================================================
