-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 147 (Supabase / PostgreSQL)
-- Seminovo já tinha fallback (se o aparelho não tem foto própria, usa
-- a do produto genérico) — lacrado nunca teve isso (decisão da Fase
-- 107, pra nunca mostrar cor errada). Pedido explícito agora: mostrar
-- ALGUMA foto (de outra cor do mesmo modelo) é melhor que não mostrar
-- nada, enquanto a cor específica não tem foto própria importada ainda.
-- ============================================================================

drop function if exists listar_lacrados_variantes_publico(uuid);

create function listar_lacrados_variantes_publico(p_modelo_id uuid)
returns table (id uuid, cor text, armazenamento text, quantidade integer, preco_venda numeric, fotos text[])
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id, v.cor, v.armazenamento, v.quantidade, v.preco_venda,
    coalesce(
      -- 1ª tentativa: foto da própria cor.
      (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = v.banco_imagens_grupo_id),
      -- 2ª tentativa (fallback novo): acha qualquer OUTRA variante do
      -- mesmo modelo que já tenha grupo de foto vinculado, e usa as
      -- fotos DAQUELE grupo — melhor mostrar algo (mesmo que a cor não
      -- seja exata) do que não mostrar nada.
      (
        select array_agg(f.url order by f.ordem)
        from banco_imagens_fotos f
        where f.grupo_id = (
          select v2.banco_imagens_grupo_id
          from catalogo_lacrados_variantes v2
          where v2.modelo_id = v.modelo_id and v2.banco_imagens_grupo_id is not null
          order by v2.id
          limit 1
        )
      ),
      '{}'::text[]
    ) as fotos
  from catalogo_lacrados_variantes v
  where v.modelo_id = p_modelo_id and v.ativo = true and v.quantidade > 0
  order by v.armazenamento, v.cor;
$$;

grant execute on function listar_lacrados_variantes_publico(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 147
-- ============================================================================
