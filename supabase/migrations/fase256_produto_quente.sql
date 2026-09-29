-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 256 (Supabase / PostgreSQL)
-- Recurso "🔥 Produto Quente" — página de alta conversão opcional por
-- produto, ligada por um toggle simples (mesmo padrão de
-- `mostrar_trade_in`, Fase 127). Aditivo: não remove nem renomeia nada.
--
-- `produto_quente_conteudo` é a PRIMEIRA coluna jsonb de `produtos` —
-- decisão deliberada (ver relatório de arquitetura entregue antes desta
-- fase): guarda o conteúdo gerado por IA (headline, benefícios, FAQ
-- etc), sempre editável manualmente depois, nunca um "page builder".
-- ============================================================================

alter table produtos
  add column if not exists produto_quente boolean not null default false,
  add column if not exists produto_quente_link_ml text,
  add column if not exists produto_quente_conteudo jsonb,
  add column if not exists produto_quente_video_url text;

comment on column produtos.produto_quente is
  'Liga a página de alta conversão pra esse produto — a mesma URL (/loja/produto/{slug}) passa a renderizar o template "quente" em vez do normal. Nasce desligado.';
comment on column produtos.produto_quente_link_ml is
  'Link opcional de um anúncio de referência (ex: Mercado Livre) — usado como fonte extra pra IA gerar o conteúdo da página quente. Nunca copiado literalmente, só resumido.';
comment on column produtos.produto_quente_conteudo is
  'Conteúdo comercial gerado por IA pra página quente (headline, subtítulo, benefícios, FAQ, objeções, destaques) — jsonb solto, sem schema rígido de tabela, editável manualmente no admin depois de gerado. Nunca inventa característica técnica: a IA só usa o que está cadastrado no produto + o que foi extraído do link de referência.';
comment on column produtos.produto_quente_video_url is
  'Vídeo opcional (YouTube ou link direto .mp4) exibido na página Produto Quente. Campo novo — não existia nenhum campo de vídeo em `produtos` antes desta fase (só `aparelhos.video_url`, que é vídeo de checklist/vistoria, outro propósito). Opcional: sem vídeo, a seção simplesmente não aparece.';

-- Novo evento de analytics — clique específico em "Comprar Agora" na
-- página quente, separado de `add_to_cart` (que já é disparado pelo
-- mesmo botão via `adicionar()`) pra dar visibilidade própria no funil,
-- conforme pedido (item 22 do brief: "identificar cliques em Comprar
-- Agora" separadamente). Precisa ser o único comando da transação —
-- Postgres não permite usar um valor de enum recém-criado na mesma
-- transação em que ele foi adicionado (mesmo padrão da Fase 255).
alter type tipo_evento_loja add value if not exists 'comprar_agora_click';

-- Expor produto_quente/produto_quente_conteudo no catálogo público —
-- sem isso a rota `/loja/produto/[slug]` nunca saberia que deve
-- renderizar o template quente. `produto_quente_link_ml` NÃO é exposto
-- aqui de propósito: é dado de referência interna (pra IA), sem uso na
-- vitrine pública.
drop function if exists listar_produtos_loja();

create function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[], mostrar_trade_in boolean,
  produto_quente boolean, produto_quente_conteudo jsonb, produto_quente_video_url text
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
        then (
          select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
          from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id
        )
      else p.fotos
    end as fotos,
    p.mostrar_trade_in, p.produto_quente, p.produto_quente_conteudo, p.produto_quente_video_url
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo';
$$;
grant execute on function listar_produtos_loja() to anon, authenticated;

drop function if exists buscar_produto_loja(text);

create function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[], mostrar_trade_in boolean,
  produto_quente boolean, produto_quente_conteudo jsonb, produto_quente_video_url text
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
        then (
          select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
          from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id
        )
      else p.fotos
    end as fotos,
    p.mostrar_trade_in, p.produto_quente, p.produto_quente_conteudo, p.produto_quente_video_url
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo' and p.slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

-- View de administração (staff) — inclui os 4 campos novos, inclusive
-- o link do Mercado Livre (uso interno, nunca exposto nas funções
-- públicas acima).
drop view if exists vw_produtos_seguro;

create view vw_produtos_seguro as
select
  id, categoria, marca, modelo, nome, descricao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  estoque_minimo,
  status, created_at, updated_at,
  visivel_loja, slug, descricao_loja, preco_antigo, selos_manuais,
  fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado, mostrar_trade_in, retirar_em,
  produto_quente, produto_quente_link_ml, produto_quente_conteudo, produto_quente_video_url
from produtos;

grant select on vw_produtos_seguro to authenticated;

notify pgrst, 'reload schema';
