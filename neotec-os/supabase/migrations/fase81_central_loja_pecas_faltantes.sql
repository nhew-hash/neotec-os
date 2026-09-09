-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 81 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: as peças da "Central da Loja" que genuinamente
-- não existiam ainda — Cupons, Marcas, Coleções, Fretes, Avaliações.
-- O resto do menu pedido (Produtos, Seminovos, Lacrados, Pedidos,
-- Estoque, Financeiro, Configurações, Integrações) já existe em telas
-- próprias — a Central da Loja organiza tudo isso num menu só, sem
-- duplicar ou mover nada que já funciona.
-- ============================================================================

-- ---- Marcas e Coleções — organização de catálogo ----
create table marcas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  ativo boolean not null default true,
  unique (loja_id, nome)
);

create table colecoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 0
);

create table colecao_produtos (
  id uuid primary key default gen_random_uuid(),
  colecao_id uuid not null references colecoes(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  unique (colecao_id, produto_id)
);

-- ---- Cupons ----
create type tipo_desconto_cupom as enum ('percentual', 'valor_fixo');

create table cupons (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  codigo text not null,
  tipo_desconto tipo_desconto_cupom not null,
  valor numeric(12,2) not null,
  valor_minimo_pedido numeric(12,2),
  limite_uso integer,
  usos integer not null default 0,
  valido_de timestamptz,
  valido_ate timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (loja_id, codigo)
);

create table cupom_usos (
  id uuid primary key default gen_random_uuid(),
  cupom_id uuid not null references cupons(id),
  pedido_id uuid references pedidos_loja(id),
  usado_em timestamptz not null default now()
);

-- ---- Fretes — regras simples por região, como descrito (Araguari/Uberlândia grátis em 1 dia útil) ----
create table regras_frete (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  regiao text not null,
  valor numeric(12,2) not null default 0,
  prazo_dias_uteis integer not null default 1,
  ativo boolean not null default true,
  ordem integer not null default 0
);

insert into regras_frete (loja_id, regiao, valor, prazo_dias_uteis, ordem)
select id, 'Araguari', 0, 1, 0 from lojas;
insert into regras_frete (loja_id, regiao, valor, prazo_dias_uteis, ordem)
select id, 'Uberlândia', 0, 1, 1 from lojas;

-- ---- Avaliações — com foto, aprovação manual antes de publicar ----
create table avaliacoes_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  produto_id uuid references produtos(id),
  nome_cliente text not null,
  cidade text,
  nota integer not null check (nota between 1 and 5),
  comentario text,
  foto_url text,
  aprovado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---- SEO — configuração global simples (título/descrição padrão da loja) ----
create table config_seo_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null unique default default_loja_id() references lojas(id),
  titulo_padrao text,
  descricao_padrao text,
  updated_at timestamptz not null default now()
);

insert into config_seo_loja (loja_id) select id from lojas;

create trigger trg_config_seo_loja_updated_at
  before update on config_seo_loja
  for each row execute function set_updated_at();

alter table marcas enable row level security;
alter table colecoes enable row level security;
alter table colecao_produtos enable row level security;
alter table cupons enable row level security;
alter table cupom_usos enable row level security;
alter table regras_frete enable row level security;
alter table avaliacoes_loja enable row level security;
alter table config_seo_loja enable row level security;

create policy "marcas_admin_gerente_write" on marcas for all using (current_user_cargo() in ('admin','gerente') and loja_id = current_user_loja_id());
create policy "colecoes_admin_gerente_write" on colecoes for all using (current_user_cargo() in ('admin','gerente') and loja_id = current_user_loja_id());
create policy "colecao_produtos_staff_all" on colecao_produtos for all
  using (exists (select 1 from colecoes c where c.id = colecao_produtos.colecao_id and c.loja_id = current_user_loja_id()));
create policy "cupons_admin_gerente_write" on cupons for all using (current_user_cargo() in ('admin','gerente') and loja_id = current_user_loja_id());
create policy "cupom_usos_staff_select" on cupom_usos for select
  using (exists (select 1 from cupons c where c.id = cupom_usos.cupom_id and c.loja_id = current_user_loja_id()));
create policy "regras_frete_admin_gerente_write" on regras_frete for all using (current_user_cargo() in ('admin','gerente') and loja_id = current_user_loja_id());
create policy "avaliacoes_loja_staff_all" on avaliacoes_loja for all using (current_user_cargo() in ('admin','gerente','vendedor') and loja_id = current_user_loja_id());
create policy "config_seo_loja_admin_write" on config_seo_loja for all using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- ---- Leitura pública (loja, sem sessão) ----
create or replace function listar_marcas_publico()
returns setof marcas language sql stable security definer set search_path = public
as $$ select * from marcas where ativo = true order by nome; $$;
grant execute on function listar_marcas_publico() to anon, authenticated;

create or replace function listar_colecoes_publico()
returns setof colecoes language sql stable security definer set search_path = public
as $$ select * from colecoes where ativo = true order by ordem; $$;
grant execute on function listar_colecoes_publico() to anon, authenticated;

create or replace function listar_regras_frete_publico()
returns setof regras_frete language sql stable security definer set search_path = public
as $$ select * from regras_frete where ativo = true order by ordem; $$;
grant execute on function listar_regras_frete_publico() to anon, authenticated;

create or replace function listar_avaliacoes_publico(p_produto_id uuid default null)
returns setof avaliacoes_loja language sql stable security definer set search_path = public
as $$
  select * from avaliacoes_loja
  where aprovado = true and (p_produto_id is null or produto_id = p_produto_id)
  order by created_at desc;
$$;
grant execute on function listar_avaliacoes_publico(uuid) to anon, authenticated;

create or replace function obter_config_seo_publico()
returns table (titulo_padrao text, descricao_padrao text)
language sql stable security definer set search_path = public
as $$ select titulo_padrao, descricao_padrao from config_seo_loja limit 1; $$;
grant execute on function obter_config_seo_publico() to anon, authenticated;

-- Validação de cupom — pública (checkout não tem sessão), mas só
-- devolve se é válido e o desconto, nunca lista todos os cupons.
create or replace function validar_cupom_publico(p_codigo text, p_valor_pedido numeric)
returns table (valido boolean, motivo text, tipo_desconto text, valor numeric)
language plpgsql stable security definer set search_path = public
as $$
declare
  c record;
begin
  select * into c from cupons where codigo = upper(p_codigo) and ativo = true;

  if not found then
    return query select false, 'Cupom não encontrado', null::text, null::numeric;
    return;
  end if;
  if c.valido_de is not null and now() < c.valido_de then
    return query select false, 'Cupom ainda não está válido', null::text, null::numeric;
    return;
  end if;
  if c.valido_ate is not null and now() > c.valido_ate then
    return query select false, 'Cupom expirado', null::text, null::numeric;
    return;
  end if;
  if c.limite_uso is not null and c.usos >= c.limite_uso then
    return query select false, 'Cupom esgotado', null::text, null::numeric;
    return;
  end if;
  if c.valor_minimo_pedido is not null and p_valor_pedido < c.valor_minimo_pedido then
    return query select false, format('Pedido mínimo de R$ %s pra esse cupom', c.valor_minimo_pedido), null::text, null::numeric;
    return;
  end if;

  return query select true, null::text, c.tipo_desconto::text, c.valor;
end;
$$;
grant execute on function validar_cupom_publico(text, numeric) to anon, authenticated;

alter publication supabase_realtime add table avaliacoes_loja;
alter publication supabase_realtime add table cupons;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 81
-- ============================================================================
