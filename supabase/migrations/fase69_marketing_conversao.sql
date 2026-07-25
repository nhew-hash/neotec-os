-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 69 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: fundação do módulo de Marketing & Conversão —
-- config geral (desconto Pix), barra superior rotativa, biblioteca de
-- selos de confiança (faixa abaixo do botão comprar), preço antigo
-- (pra calcular economia real, nunca inventada).
--
-- REGRA SEGUIDA EM TODA ESTA FASE: nenhum dado de "urgência"/"prova
-- social" é inventado. Contador de vendas, estoque baixo e economia
-- vêm sempre de dado real (vendas de verdade, estoque de verdade,
-- preço antigo configurado pelo admin) — nunca número aleatório.
-- ============================================================================

create table config_marketing_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null unique default default_loja_id() references lojas(id),
  pix_desconto_percentual numeric(5,2) not null default 0,
  estoque_baixo_limite integer not null default 3,
  contador_vendas_ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger trg_config_marketing_loja_updated_at
  before update on config_marketing_loja
  for each row execute function set_updated_at();

insert into config_marketing_loja (loja_id) select id from lojas;

create table barra_topo_itens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  texto text not null,
  icone text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_barra_topo_itens_ordem on barra_topo_itens(loja_id, ordem);

create trigger trg_barra_topo_itens_updated_at
  before update on barra_topo_itens
  for each row execute function set_updated_at();

create type tipo_selo_confianca as enum (
  'produto_original', 'garantia', 'nota_fiscal', 'loja_fisica', 'assistencia_tecnica', 'pagamento_seguro'
);

create table selos_confianca (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  tipo tipo_selo_confianca not null,
  label text not null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  unique (loja_id, tipo)
);

-- Semente — os 6 selos padrão, todos ativos (admin desativa o que não quiser).
insert into selos_confianca (loja_id, tipo, label, ordem)
select id, t.tipo, t.label, t.ordem
from lojas
cross join (values
  ('produto_original'::tipo_selo_confianca, 'Produto Original', 0),
  ('garantia'::tipo_selo_confianca, 'Garantia', 1),
  ('nota_fiscal'::tipo_selo_confianca, 'Nota Fiscal', 2),
  ('loja_fisica'::tipo_selo_confianca, 'Loja Física', 3),
  ('assistencia_tecnica'::tipo_selo_confianca, 'Assistência Especializada', 4),
  ('pagamento_seguro'::tipo_selo_confianca, 'Pagamento Seguro', 5)
) as t(tipo, label, ordem);

-- Preço antigo — habilita "De: X Por: Y Economize: Z" quando
-- preenchido. Nulo = sem desconto mostrado (nunca calcula economia
-- fictícia). Adicionado nos três lugares que têm preço na loja.
alter table produtos add column if not exists preco_antigo numeric(12,2);
alter table aparelhos add column if not exists preco_antigo numeric(12,2);
alter table catalogo_lacrados_variantes add column if not exists preco_antigo numeric(12,2);

-- Selos manuais por produto (novidade, promoção, oferta, escolha da
-- equipe) — os automáticos (mais vendido, últimas unidades) são
-- calculados na hora de renderizar, não guardados aqui.
alter table produtos add column if not exists selos_manuais text[] not null default '{}';

-- Complementares — "complete sua compra", escolhido manualmente pelo
-- admin (diferente de relacionados, que é regra automática por categoria).
create table produto_complementares (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  complementar_produto_id uuid not null references produtos(id) on delete cascade,
  ordem integer not null default 0,
  unique (produto_id, complementar_produto_id),
  check (produto_id != complementar_produto_id)
);

alter table config_marketing_loja enable row level security;
alter table barra_topo_itens enable row level security;
alter table selos_confianca enable row level security;
alter table produto_complementares enable row level security;

create policy "config_marketing_loja_admin_gerente_write" on config_marketing_loja for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());
create policy "barra_topo_itens_admin_gerente_write" on barra_topo_itens for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());
create policy "selos_confianca_admin_gerente_write" on selos_confianca for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());
create policy "produto_complementares_staff_all" on produto_complementares for all
  using (
    exists (select 1 from produtos p where p.id = produto_complementares.produto_id and p.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

-- ---- Leitura pública (loja, sem sessão) ----
create or replace function obter_config_marketing_publico()
returns table (pix_desconto_percentual numeric, estoque_baixo_limite integer, contador_vendas_ativo boolean)
language sql stable security definer set search_path = public
as $$
  select pix_desconto_percentual, estoque_baixo_limite, contador_vendas_ativo from config_marketing_loja limit 1;
$$;
grant execute on function obter_config_marketing_publico() to anon, authenticated;

create or replace function listar_barra_topo_publico()
returns setof barra_topo_itens
language sql stable security definer set search_path = public
as $$
  select * from barra_topo_itens where ativo = true order by ordem;
$$;
grant execute on function listar_barra_topo_publico() to anon, authenticated;

create or replace function listar_selos_confianca_publico()
returns setof selos_confianca
language sql stable security definer set search_path = public
as $$
  select * from selos_confianca where ativo = true order by ordem;
$$;
grant execute on function listar_selos_confianca_publico() to anon, authenticated;

alter publication supabase_realtime add table barra_topo_itens;
alter publication supabase_realtime add table selos_confianca;

-- Atualiza as funções públicas de catálogo (Fase 58) pra incluir os
-- campos novos — preço antigo (economia real) e selos manuais.
create or replace function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text
)
language sql stable security definer set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, preco_antigo, selos_manuais, slug
  from produtos
  where visivel_loja = true and status = 'ativo';
$$;
grant execute on function listar_produtos_loja() to anon, authenticated;

create or replace function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text
)
language sql stable security definer set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, preco_antigo, selos_manuais, slug
  from produtos
  where visivel_loja = true and status = 'ativo' and slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 69
-- ============================================================================
