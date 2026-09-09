-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 127 (Supabase / PostgreSQL)
-- Banner "Tem um aparelho pra dar de entrada?" aparecia em TODO
-- produto, sem controle. Adiciona opção por item (nasce desligada —
-- resolve o "tá aparecendo em todos" na hora, sem precisar desligar
-- item por item manualmente depois).
--
-- Atualiza as views de segurança (vw_produtos_seguro/vw_aparelhos_seguro)
-- na MESMA migração que cria a coluna nova — lição da Fase 125, pra
-- não deixar essa lacuna acontecer de novo.
-- ============================================================================

alter table produtos add column if not exists mostrar_trade_in boolean not null default false;
alter table aparelhos add column if not exists mostrar_trade_in boolean not null default false;

comment on column produtos.mostrar_trade_in is 'Controla se o banner "Avalie seu aparelho" aparece na página desse produto. Nasce desligado — liga item por item em Estoque.';
comment on column aparelhos.mostrar_trade_in is 'Mesmo controle, por unidade individual quando fizer sentido diferenciar de outras unidades do mesmo produto.';

drop function if exists listar_produtos_loja();

create function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[], mostrar_trade_in boolean
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
    end as fotos,
    p.mostrar_trade_in
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo';
$$;
grant execute on function listar_produtos_loja() to anon, authenticated;

drop function if exists buscar_produto_loja(text);

create function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[], mostrar_trade_in boolean
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
    end as fotos,
    p.mostrar_trade_in
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo' and p.slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

drop view if exists vw_produtos_seguro;

create view vw_produtos_seguro as
select
  id, categoria, marca, modelo, nome, descricao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  estoque_minimo,
  status, created_at, updated_at,
  visivel_loja, slug, descricao_loja, preco_antigo, selos_manuais,
  fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado, mostrar_trade_in
from produtos;

grant select on vw_produtos_seguro to authenticated;

drop view if exists vw_aparelhos_seguro;

create view vw_aparelhos_seguro as
select
  id, produto_id, imei, numero_serie, cor, memoria, bateria, condicao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  case when current_user_cargo() = 'admin' then preco_minimo else null end as preco_minimo,
  preco_sugerido,
  fornecedor, origem_entrada, investidor_id, consignacao_id,
  status, cliente_origem_id, data_entrada, updated_at,
  pecas_substituidas, observacoes, preco_antigo,
  tela_original, face_id_ok, true_tone_ok, video_url,
  disponivel_loja_virtual, fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado, mostrar_trade_in
from aparelhos;

grant select on vw_aparelhos_seguro to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 127
-- ============================================================================
