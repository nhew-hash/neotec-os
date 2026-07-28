-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 117 (Supabase / PostgreSQL)
-- Card da grade (catálogo) só mostrava preço quando `produtos.preco_venda`
-- estava preenchido — funciona pra produto genérico (preço fica no
-- próprio produto), mas fica vazio pra seminovo (preço é por
-- APARELHO, o produto é só um "molde" compartilhado) e lacrado
-- (preço é por VARIANTE). Adiciona "preço a partir de" calculado a
-- partir da unidade mais barata disponível, como fallback.
-- ============================================================================

drop function if exists listar_produtos_loja();

create function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[]
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.categoria, p.marca, p.modelo, p.nome, p.descricao_loja,
    coalesce(
      p.preco_venda,
      (select min(a.preco_venda) from aparelhos a where a.produto_id = p.id and a.status = 'disponivel' and a.disponivel_loja_virtual = true)
    ) as preco_venda,
    p.preco_antigo, p.selos_manuais, p.slug,
    case
      when p.banco_imagens_grupo_id is not null and exists (select 1 from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
        then (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
      else p.fotos
    end as fotos
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo';
$$;
grant execute on function listar_produtos_loja() to anon, authenticated;

drop function if exists buscar_produto_loja(text);

create function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[]
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.categoria, p.marca, p.modelo, p.nome, p.descricao_loja,
    coalesce(
      p.preco_venda,
      (select min(a.preco_venda) from aparelhos a where a.produto_id = p.id and a.status = 'disponivel' and a.disponivel_loja_virtual = true)
    ) as preco_venda,
    p.preco_antigo, p.selos_manuais, p.slug,
    case
      when p.banco_imagens_grupo_id is not null and exists (select 1 from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
        then (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
      else p.fotos
    end as fotos
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo' and p.slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

drop function if exists listar_lacrados_modelos_publico();

create function listar_lacrados_modelos_publico()
returns table (id uuid, nome text, marca text, fotos text[], preco_a_partir_de numeric)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    m.id, m.nome, m.marca, m.fotos,
    (select min(v2.preco_venda) from catalogo_lacrados_variantes v2 where v2.modelo_id = m.id and v2.ativo = true and v2.quantidade > 0) as preco_a_partir_de
  from catalogo_lacrados_modelos m
  join catalogo_lacrados_variantes v on v.modelo_id = m.id
  where m.ativo = true and v.ativo = true and v.quantidade > 0
  order by m.nome;
$$;

grant execute on function listar_lacrados_modelos_publico() to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 117
-- ============================================================================
