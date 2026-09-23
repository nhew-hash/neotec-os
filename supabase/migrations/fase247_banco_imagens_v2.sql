-- ============================================================================
-- NEOTEC OS — FASE 247: Banco Central de Imagens v2
-- (importação em lote, cores equivalentes, categorias)
--
-- Prepara o banco pra receber o catálogo externo padronizado (109
-- modelos / 242 combinações modelo+cor) sem quebrar nada do que já
-- funciona. Tudo ADITIVO — nenhuma coluna removida, nenhum dado tocado.
--
-- Contexto do problema que isso resolve: hoje o grupo do banco de
-- imagens colapsa cores oficiais da Apple (Estelar/Prateado/Silver →
-- Branco, Meia-noite/Grafite → Preto, "Titânio X" → "Titânio") na
-- própria IDENTIDADE do grupo — por isso os 4 titânios do iPhone 15 Pro
-- (Natural/Preto/Azul/Branco) viram um grupo só e se sobrescrevem. A
-- partir desta fase o grupo guarda a cor OFICIAL, e a tradução
-- simplificada vira só uma entrada em `cores_equivalentes`, usada
-- apenas para casar com o estoque (ver correspondencia.ts).
-- ============================================================================

alter table banco_imagens_grupos
  add column if not exists origem_id text,
  add column if not exists categoria text,
  add column if not exists cores_equivalentes text[] not null default '{}',
  add column if not exists modelos_equivalentes text[] not null default '{}',
  add column if not exists classificacao text not null default 'catalogo',
  add column if not exists fonte_url text,
  add column if not exists observacao text;

-- classificacao: 'catalogo' (foto de catálogo/fabricante, genérica pro
-- modelo+cor) | 'foto_real_terceiros' (foto real de um fornecedor
-- específico) | 'foto_real_neotec' (foto tirada pela própria loja).
alter table banco_imagens_grupos drop constraint if exists banco_imagens_grupos_classificacao_check;
alter table banco_imagens_grupos add constraint banco_imagens_grupos_classificacao_check
  check (classificacao in ('catalogo', 'foto_real_terceiros', 'foto_real_neotec'));

-- origem_id: identificador estável do banco externo (ex: "IPHONE13-AZUL")
-- — permite reimportar em lote sem duplicar grupo (upsert por origem_id).
-- Só é obrigatoriamente único quando preenchido (grupos criados à mão
-- pela tela de "Importar pasta" continuam sem origem_id, valor null,
-- e `nulls not distinct` do índice abaixo não se aplica a eles porque
-- usamos índice único parcial, não a constraint da tabela toda).
create unique index if not exists idx_banco_imagens_grupos_origem_id
  on banco_imagens_grupos (loja_id, origem_id) where origem_id is not null;

create index if not exists idx_banco_imagens_grupos_categoria on banco_imagens_grupos (categoria);
create index if not exists idx_banco_imagens_grupos_cores_equivalentes on banco_imagens_grupos using gin (cores_equivalentes);
create index if not exists idx_banco_imagens_grupos_modelos_equivalentes on banco_imagens_grupos using gin (modelos_equivalentes);

alter table banco_imagens_fotos
  add column if not exists tipo text not null default 'principal',
  add column if not exists caminho_storage text;

alter table banco_imagens_fotos drop constraint if exists banco_imagens_fotos_tipo_check;
alter table banco_imagens_fotos add constraint banco_imagens_fotos_tipo_check
  check (tipo in ('principal', 'adicional', 'cenario'));

comment on column banco_imagens_grupos.origem_id is 'Identificador estável do banco de imagens externo (ex: IPHONE13-AZUL) — permite reimportar em lote de forma idempotente, sem duplicar grupo.';
comment on column banco_imagens_grupos.categoria is 'Categoria livre (sem enum) vinda do banco externo: Smartphone, Perfume, Caixa de som, Tablet, Smartwatch, Fone, Notebook, Microfone, Triciclo elétrico, Robô aspirador, etc.';
comment on column banco_imagens_grupos.cores_equivalentes is 'Nomes alternativos da MESMA cor (ex: grupo "Estelar" -> {Branco, Branco/Prata, Starlight}), usados só pra casar com o estoque — nunca mudam a identidade/cor oficial do grupo.';
comment on column banco_imagens_grupos.modelos_equivalentes is 'Nomes alternativos do MESMO modelo (ex: {Fursan Unlimited} para "Qaed Al Fursan Unlimited", {Redmi Pad 2}) — usados só pra casar com o estoque.';
comment on column banco_imagens_fotos.tipo is 'principal (fundo branco/catálogo) | adicional (mais um ângulo) | cenario (versão "cenário Neotec", entra depois da capa na loja quando existir).';
comment on column banco_imagens_fotos.caminho_storage is 'Caminho do arquivo dentro do bucket produtos-fotos — guardado explicitamente pra permitir apagar/substituir sem precisar re-derivar da URL pública.';

-- ============================================================================
-- Prioridade de foto "cenário" (item 5 do pedido) — quando o grupo tem
-- foto tipo='cenario', ela entra logo depois da capa (ordem=0), antes
-- do resto. Redefine as mesmas 5 funções públicas que já resolviam
-- fotos pelo grupo, preservando 100% da lógica de cada uma (preço,
-- fallback de lacrado, mostrar_trade_in etc — só troca o "order by"
-- de dentro do array_agg de fotos). Nenhuma assinatura muda.
-- ============================================================================

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
        then (
          select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
          from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id
        )
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
        then (
          select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
          from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id
        )
      else p.fotos
    end as fotos,
    p.mostrar_trade_in
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo' and p.slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

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
        then (
          select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
          from banco_imagens_fotos f where f.grupo_id = a.banco_imagens_grupo_id
        )
      else a.fotos
    end as fotos
  from aparelhos a
  join produtos p on p.id = a.produto_id
  where a.produto_id = p_produto_id and a.status = 'disponivel' and a.disponivel_loja_virtual = true;
$$;
grant execute on function listar_aparelhos_disponiveis_loja(uuid) to anon, authenticated;

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
      (
        select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
        from banco_imagens_fotos f where f.grupo_id = v.banco_imagens_grupo_id
      ),
      -- 2ª tentativa (fallback, Fase 147): acha qualquer OUTRA variante
      -- do mesmo modelo que já tenha grupo de foto vinculado.
      (
        select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
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
      (
        select array_agg(f.url order by (case when f.ordem = 0 then 0 when f.tipo = 'cenario' then 1 else 2 end), f.ordem)
        from banco_imagens_fotos f
        where f.grupo_id = (
          select v.banco_imagens_grupo_id
          from catalogo_lacrados_variantes v
          where v.modelo_id = m.id and v.banco_imagens_grupo_id is not null and v.ativo = true and v.quantidade > 0
          order by v.id
          limit 1
        )
      ),
      m.fotos,
      '{}'::text[]
    ) as fotos,
    (select min(v2.preco_venda) from catalogo_lacrados_variantes v2 where v2.modelo_id = m.id and v2.ativo = true and v2.quantidade > 0) as preco_a_partir_de
  from catalogo_lacrados_modelos m
  where m.ativo = true
    and exists (select 1 from catalogo_lacrados_variantes v where v.modelo_id = m.id and v.ativo = true and v.quantidade > 0)
  order by m.nome;
$$;
grant execute on function listar_lacrados_modelos_publico() to anon, authenticated;

drop function if exists listar_fotos_grupo_publico(uuid);

create function listar_fotos_grupo_publico(p_grupo_id uuid)
returns table (url text, ordem integer, tipo text)
language sql stable security definer set search_path = public
as $$
  select url, ordem, tipo from banco_imagens_fotos
  where grupo_id = p_grupo_id
  order by (case when ordem = 0 then 0 when tipo = 'cenario' then 1 else 2 end), ordem;
$$;
grant execute on function listar_fotos_grupo_publico(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 247
-- ============================================================================
