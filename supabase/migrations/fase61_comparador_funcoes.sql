-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 61 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: função pública usada pela página de comparação de
-- iPhones (/loja/comparar) — mesmo padrão SECURITY DEFINER das outras
-- funções da loja pública (Fase 58), só que recebendo vários IDs de
-- uma vez em vez de um por chamada.
-- ============================================================================

create or replace function comparar_produtos_loja(p_ids uuid[])
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, slug
  from produtos
  where visivel_loja = true and status = 'ativo' and id = any(p_ids);
$$;

grant execute on function comparar_produtos_loja(uuid[]) to anon, authenticated;

-- Aparelhos disponíveis de vários produtos de uma vez, pra montar a
-- comparação sem N chamadas separadas.
create or replace function aparelhos_disponiveis_loja_bulk(p_produto_ids uuid[])
returns table (
  produto_id uuid, cor text, memoria text, condicao text, bateria integer, preco_venda numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select a.produto_id, a.cor, a.memoria, a.condicao, a.bateria, a.preco_venda
  from aparelhos a
  join produtos p on p.id = a.produto_id
  where a.produto_id = any(p_produto_ids) and a.status = 'disponivel' and p.visivel_loja = true;
$$;

grant execute on function aparelhos_disponiveis_loja_bulk(uuid[]) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 61
-- ============================================================================
