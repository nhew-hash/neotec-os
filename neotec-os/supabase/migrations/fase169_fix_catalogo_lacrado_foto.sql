-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 169 (Supabase / PostgreSQL)
-- Achado: `listar_lacrados_modelos_publico` (catálogo/grade) ainda
-- buscava foto em `catalogo_lacrados_modelos.fotos` — coluna que
-- ficou obsoleta desde a Fase 107, quando a vinculação de foto passou
-- pra nível de VARIANTE (banco_imagens_grupo_id na variante, não no
-- modelo). Por isso o catálogo nunca mostrava foto — buscava no
-- lugar errado. A página de produto (PDP) já buscava certo na
-- variante, por isso funcionava lá.
-- ============================================================================

drop function if exists listar_lacrados_modelos_publico();

create function listar_lacrados_modelos_publico()
returns table (id uuid, nome text, marca text, fotos text[], preco_a_partir_de numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.nome, m.marca,
    coalesce(
      -- Pega a foto de QUALQUER variante desse modelo que já tenha
      -- grupo de imagem vinculado — mesma lógica de fallback já usada
      -- na página de produto (Fase 147), aplicada aqui na grade também.
      (
        select array_agg(f.url order by f.ordem)
        from banco_imagens_fotos f
        where f.grupo_id = (
          select v.banco_imagens_grupo_id
          from catalogo_lacrados_variantes v
          where v.modelo_id = m.id and v.banco_imagens_grupo_id is not null and v.ativo = true and v.quantidade > 0
          order by v.id
          limit 1
        )
      ),
      m.fotos, -- fallback final pro campo antigo, caso algum modelo ainda tenha usado ele
      '{}'::text[]
    ) as fotos,
    (select min(v2.preco_venda) from catalogo_lacrados_variantes v2 where v2.modelo_id = m.id and v2.ativo = true and v2.quantidade > 0) as preco_a_partir_de
  from catalogo_lacrados_modelos m
  where m.ativo = true
    and exists (select 1 from catalogo_lacrados_variantes v where v.modelo_id = m.id and v.ativo = true and v.quantidade > 0)
  order by m.nome;
$$;

grant execute on function listar_lacrados_modelos_publico() to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 169
-- ============================================================================
