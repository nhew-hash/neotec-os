-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 107 (Supabase / PostgreSQL)
-- Corrige um erro de arquitetura da Fase 103/104: o vínculo de foto de
-- lacrado ficava no MODELO (ex: "iPhone 15"), não na VARIANTE de cor.
-- Isso fazia importar "iPhone Branco" e depois "iPhone Preto"
-- SOBRESCREVEREM um ao outro no mesmo modelo — o cliente sempre via a
-- última cor importada, nunca a que ele realmente escolheu.
--
-- Agora o vínculo é por VARIANTE (modelo + cor) — sem fallback: se uma
-- variante de cor não tem grupo de imagem vinculado, não mostra
-- nenhuma foto (nunca mostra a foto de outra cor por engano).
-- ============================================================================

alter table catalogo_lacrados_variantes add column if not exists banco_imagens_grupo_id uuid references banco_imagens_grupos(id) on delete set null;

-- O vínculo no MODELO (Fase 103) fica mantido no schema por
-- compatibilidade, mas para de ser usado na exibição — zera pra não
-- confundir quem for olhar o dado depois.
update catalogo_lacrados_modelos set banco_imagens_grupo_id = null;

-- Atualiza a função pública de variantes pra devolver as fotos
-- vinculadas na VARIANTE — "drop" antes é obrigatório (Postgres não
-- deixa "create or replace function" mudar colunas de retorno).
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
      (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = v.banco_imagens_grupo_id),
      '{}'::text[]
    ) as fotos
  from catalogo_lacrados_variantes v
  where v.modelo_id = p_modelo_id and v.ativo = true and v.quantidade > 0
  order by v.armazenamento, v.cor;
$$;

grant execute on function listar_lacrados_variantes_publico(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 107
-- ============================================================================
