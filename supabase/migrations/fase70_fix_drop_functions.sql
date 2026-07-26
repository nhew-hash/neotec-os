-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 70 (Supabase / PostgreSQL)
-- Correção: "cannot change return type of existing function" — o
-- Postgres não deixa `create or replace function` mudar as colunas de
-- retorno de uma função `returns table(...)` já existente, é preciso
-- `drop function` antes. As Fases 68 e 69 tentaram adicionar colunas
-- de retorno em funções já existentes desde a Fase 58 sem fazer esse
-- drop primeiro — corrigido aqui pras 3 funções afetadas.
--
-- Segura rodar em qualquer ordem em relação à Fase 68/69 — usa
-- "drop function if exists", então não falha se a função já não
-- existir ou já estiver no formato certo.
-- ============================================================================

-- Garante que as colunas usadas pelas funções abaixo existem, mesmo
-- que a Fase 69 não tenha rodado ainda (ou tenha parado antes de
-- chegar nesse ponto) — sem isso, "create function" falha na hora,
-- porque funções "language sql" são validadas contra o schema já na
-- criação, não só na hora de rodar.
alter table produtos add column if not exists preco_antigo numeric(12,2);
alter table produtos add column if not exists selos_manuais text[] not null default '{}';
alter table aparelhos add column if not exists pecas_substituidas text[] not null default '{}';
alter table aparelhos add column if not exists observacoes text;

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

drop function if exists listar_produtos_loja();

create function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, preco_antigo, selos_manuais, slug
  from produtos
  where visivel_loja = true and status = 'ativo';
$$;

grant execute on function listar_produtos_loja() to anon, authenticated;

drop function if exists buscar_produto_loja(text);

create function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, preco_antigo, selos_manuais, slug
  from produtos
  where visivel_loja = true and status = 'ativo' and slug = p_slug;
$$;

grant execute on function buscar_produto_loja(text) to anon, authenticated;

-- Garante que a coluna da Fase 68 existe, independente de até onde
-- aquela migração chegou antes de falhar.
alter table pedido_loja_itens
  add column if not exists lacrado_variante_id uuid references catalogo_lacrados_variantes(id);

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 70
-- ============================================================================
