-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 58 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: fundação da Loja Neotec (catálogo público +
-- pedidos). Reaproveita `produtos`/`aparelhos` já existentes — não cria
-- catálogo duplicado. Fase 1: checkout via WhatsApp. Fase 2 (Mercado
-- Pago) usa a mesma tabela de pedidos, só muda como ele é fechado.
-- ============================================================================

alter table produtos
  add column if not exists visivel_loja boolean not null default false,
  add column if not exists slug text unique,
  add column if not exists descricao_loja text;

comment on column produtos.visivel_loja is
  'Produto aparece na loja pública (/loja) — desligado por padrão, cada produto precisa ser publicado explicitamente.';
comment on column produtos.slug is
  'Identificador amigável na URL (/loja/produto/{slug}) — único, gerado a partir do nome na hora de publicar.';

create type status_pedido_loja as enum ('novo', 'em_atendimento', 'concluido', 'cancelado');
create type origem_fechamento_pedido as enum ('whatsapp', 'pagamento_online');

create table pedidos_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid references clientes(id),
  nome_contato text not null,
  telefone_contato text not null,
  valor_total numeric(12,2) not null,
  status status_pedido_loja not null default 'novo',
  origem_fechamento origem_fechamento_pedido not null default 'whatsapp',
  pagamento_id_externo text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_pedidos_loja_updated_at
  before update on pedidos_loja
  for each row execute function set_updated_at();

create table pedido_loja_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos_loja(id) on delete cascade,
  produto_id uuid references produtos(id),
  aparelho_id uuid references aparelhos(id),
  nome_exibido text not null,
  quantidade integer not null default 1,
  valor numeric(12,2) not null
);

create index idx_pedido_loja_itens_pedido on pedido_loja_itens(pedido_id);

alter table pedidos_loja enable row level security;
alter table pedido_loja_itens enable row level security;

-- Criar pedido é público (qualquer visitante da loja, sem login) — só
-- INSERT, nunca leitura de pedido alheio.
create policy "pedidos_loja_insert_publico" on pedidos_loja for insert
  with check (true);
create policy "pedido_loja_itens_insert_publico" on pedido_loja_itens for insert
  with check (true);

-- Equipe vê e gerencia tudo da própria loja.
create policy "pedidos_loja_staff_all" on pedidos_loja for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());
create policy "pedido_loja_itens_staff_select" on pedido_loja_itens for select
  using (exists (select 1 from pedidos_loja p where p.id = pedido_loja_itens.pedido_id and p.loja_id = current_user_loja_id()));

-- Catálogo público de leitura — só produtos publicados, execução sem
-- sessão (visitante da loja nunca está logado).
create or replace function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, slug
  from produtos
  where visivel_loja = true and status = 'ativo';
$$;

grant execute on function listar_produtos_loja() to anon, authenticated;

create or replace function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, slug
  from produtos
  where visivel_loja = true and status = 'ativo' and slug = p_slug;
$$;

grant execute on function buscar_produto_loja(text) to anon, authenticated;

-- Aparelhos disponíveis de um produto específico (ex: as unidades de
-- iPhone 13 seminovo em estoque agora) — pra escolher a unidade exata
-- na página do produto, sem expor IMEI nem dado interno.
create or replace function listar_aparelhos_disponiveis_loja(p_produto_id uuid)
returns table (
  id uuid, cor text, memoria text, condicao text, bateria integer, preco_venda numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.cor, a.memoria, a.condicao, a.bateria, a.preco_venda
  from aparelhos a
  join produtos p on p.id = a.produto_id
  where a.produto_id = p_produto_id and a.status = 'disponivel' and p.visivel_loja = true;
$$;

grant execute on function listar_aparelhos_disponiveis_loja(uuid) to anon, authenticated;

alter publication supabase_realtime add table pedidos_loja;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 58
-- ============================================================================
