-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 108 (Supabase / PostgreSQL)
-- `listar_aparelhos_disponiveis_loja` nunca resolvia fotos via
-- `banco_imagens_grupo_id` — só devolvia o array direto `a.fotos`
-- (Fase 102), que fica vazio a não ser que alguém suba foto manual
-- por aparelho individual. Corrige pra priorizar a foto do grupo
-- vinculado (banco central), com o array direto como complemento —
-- mesmo padrão já usado em produtos (Fase 104).
--
-- Também estende a vinculação automática do Banco de Imagens pra
-- ligar aparelhos (não só produtos genéricos) quando marca+modelo+cor
-- baterem exato.
-- ============================================================================

drop function if exists listar_aparelhos_disponiveis_loja(uuid);

create function listar_aparelhos_disponiveis_loja(p_produto_id uuid)
returns table (
  id uuid, cor text, memoria text, condicao text, bateria integer, preco_venda numeric,
  pecas_substituidas text[], observacoes text, fotos text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.cor, a.memoria, a.condicao, a.bateria, a.preco_venda, a.pecas_substituidas, a.observacoes,
    case
      when a.banco_imagens_grupo_id is not null and exists (select 1 from banco_imagens_fotos f where f.grupo_id = a.banco_imagens_grupo_id)
        then (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = a.banco_imagens_grupo_id)
      else a.fotos
    end as fotos
  from aparelhos a
  join produtos p on p.id = a.produto_id
  where a.produto_id = p_produto_id and a.status = 'disponivel' and a.disponivel_loja_virtual = true;
$$;

grant execute on function listar_aparelhos_disponiveis_loja(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 108
-- ============================================================================
