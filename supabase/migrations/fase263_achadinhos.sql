-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 263 (Supabase / PostgreSQL)
-- Achadinhos da Neotec — catálogo de produtos afiliados (inicialmente
-- Mercado Livre), publicado em /achadinhos.
--
-- 100% aditiva: cria tabelas/visão/bucket NOVOS, não altera nenhuma tabela
-- existente. Reaproveita os helpers que o projeto já usa em toda migração:
-- default_loja_id(), current_user_cargo(), current_user_loja_id() e
-- set_updated_at().
--
-- Decisões de segurança (importantes):
--  * A tabela de produtos guarda dado financeiro (comissão, receita, custo
--    de mídia) — por isso NÃO existe policy de leitura pública nela. O site
--    público lê só a VIEW `achadinhos_produtos_publicos`, que expõe apenas
--    colunas seguras de produtos ATIVOS e não excluídos.
--  * Cliques e logs só são escritos pelo servidor (service role) ou, no caso
--    do log, pela equipe autenticada. Nenhum visitante anônimo escreve em
--    nada daqui.
--  * Exclusão é LÓGICA (`excluido_em`) — nada de DELETE físico: o histórico
--    de cliques e de ações continua íntegro. Por isso as FKs são RESTRICT.
-- ============================================================================

-- ---- Produtos ----
create table achadinhos_produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),

  nome text not null,
  slug text not null,
  descricao text,
  categoria text,

  imagem_principal text,
  imagens jsonb not null default '[]'::jsonb,
  video_url text,

  preco_atual numeric(12,2),
  preco_anterior numeric(12,2),
  -- Informado por quem cadastra — NUNCA calculado/inventado pelo sistema.
  desconto_percentual numeric(5,2),

  link_afiliado text not null,
  origem text not null default 'mercado_livre',
  tags text[] not null default '{}',

  status text not null default 'rascunho',
  destaque boolean not null default false,
  selo text,
  score numeric(6,2) not null default 0,
  ordem integer not null default 0,

  -- [{ "rotulo": "...", "valor": "..." }] — só o que foi informado.
  informacoes jsonb not null default '[]'::jsonb,
  observacoes text,

  seo_titulo text,
  seo_descricao text,
  imagem_og text,

  -- Campos de performance (futuro: métricas, campanhas, tráfego pago).
  -- `cliques` é mantido por trigger; os demais ficam vazios até existir
  -- uma fonte de dado real (nunca preenchidos por estimativa).
  cliques integer not null default 0,
  vendas integer not null default 0,
  comissao numeric(12,2),
  receita numeric(12,2),
  custo_midia numeric(12,2),
  roas numeric(10,2),
  ctr numeric(8,4),
  cpc numeric(12,2),
  status_performance text,

  excluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (loja_id, slug),
  constraint achadinhos_status_valido check (status in ('rascunho', 'ativo', 'pausado', 'arquivado')),
  constraint achadinhos_slug_valido check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint achadinhos_link_https check (link_afiliado ~* '^https://'),
  constraint achadinhos_preco_atual_ok check (preco_atual is null or preco_atual >= 0),
  constraint achadinhos_preco_anterior_ok check (preco_anterior is null or preco_anterior >= 0),
  constraint achadinhos_desconto_ok check (desconto_percentual is null or (desconto_percentual >= 0 and desconto_percentual < 100)),
  constraint achadinhos_imagens_array check (jsonb_typeof(imagens) = 'array'),
  constraint achadinhos_informacoes_array check (jsonb_typeof(informacoes) = 'array')
);

create index idx_achadinhos_produtos_catalogo on achadinhos_produtos (loja_id, status, destaque desc, ordem, created_at desc)
  where excluido_em is null;
create index idx_achadinhos_produtos_categoria on achadinhos_produtos (loja_id, categoria) where excluido_em is null;

create trigger trg_achadinhos_produtos_updated_at before update on achadinhos_produtos
  for each row execute function set_updated_at();

-- ---- Cliques (evento affiliate_click) ----
-- Sem IP, sem user-agent, sem qualquer identificador pessoal: só o que o
-- briefing pede (produto, slug, momento, página, origem e UTMs).
create table achadinhos_cliques (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  produto_id uuid not null references achadinhos_produtos(id) on delete restrict,
  produto_slug text not null,
  criado_em timestamptz not null default now(),
  pagina text,
  origem text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text
);

create index idx_achadinhos_cliques_produto on achadinhos_cliques (produto_id, criado_em desc);
create index idx_achadinhos_cliques_loja on achadinhos_cliques (loja_id, criado_em desc);
create index idx_achadinhos_cliques_campanha on achadinhos_cliques (loja_id, utm_campaign) where utm_campaign is not null;

-- Contador denormalizado, atômico: cada clique soma 1 no produto na mesma
-- transação do INSERT (sem corrida entre dois cliques simultâneos).
create or replace function achadinhos_incrementar_cliques()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update achadinhos_produtos set cliques = cliques + 1 where id = new.produto_id;
  return new;
end;
$$;

create trigger trg_achadinhos_cliques_contador after insert on achadinhos_cliques
  for each row execute function achadinhos_incrementar_cliques();

-- ---- Chaves de API (conector do Claude) ----
-- Guarda só o HASH (sha256) da chave — a chave em si aparece uma única vez,
-- na hora da criação. `escopos` define quais operações cada chave pode fazer.
create table achadinhos_api_chaves (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  prefixo text not null,
  chave_hash text not null unique,
  escopos text[] not null default '{leitura}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid references usuarios(id),
  ultimo_uso_em timestamptz,
  revogada_em timestamptz,
  constraint achadinhos_escopos_validos check (escopos <@ array['leitura', 'escrita', 'status', 'excluir']::text[])
);

-- ---- Log de ações (auditoria) ----
-- Quem executou, qual operação, em qual produto, quando e com qual
-- resultado. Imutável pra quem não é service role (sem policy de update/
-- delete). Guarda o nome do produto como snapshot — o log continua legível
-- mesmo se o produto for renomeado.
create table achadinhos_log (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  criado_em timestamptz not null default now(),
  ator_tipo text not null,
  ator_nome text not null,
  ator_id text,
  operacao text not null,
  produto_id uuid references achadinhos_produtos(id) on delete restrict,
  produto_nome text,
  resultado text not null,
  detalhe jsonb,
  constraint achadinhos_log_ator_valido check (ator_tipo in ('claude', 'usuario', 'sistema')),
  constraint achadinhos_log_resultado_valido check (resultado in ('sucesso', 'erro', 'negado'))
);

create index idx_achadinhos_log_recente on achadinhos_log (loja_id, criado_em desc);
create index idx_achadinhos_log_produto on achadinhos_log (produto_id, criado_em desc);

-- ---- RLS ----
alter table achadinhos_produtos enable row level security;
alter table achadinhos_cliques enable row level security;
alter table achadinhos_api_chaves enable row level security;
alter table achadinhos_log enable row level security;

create policy "achadinhos_produtos_staff_all" on achadinhos_produtos for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "achadinhos_cliques_staff_select" on achadinhos_cliques for select
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Chaves de API: só admin (gerente não cria/revoga credencial de acesso).
create policy "achadinhos_api_chaves_admin_all" on achadinhos_api_chaves for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id())
  with check (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

create policy "achadinhos_log_staff_select" on achadinhos_log for select
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());
create policy "achadinhos_log_staff_insert" on achadinhos_log for insert
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id() and ator_tipo = 'usuario');

-- ---- Visão pública ----
-- Só colunas seguras, só produto ativo e não excluído. Roda com o privilégio
-- do dono da view (comportamento padrão), por isso o visitante anônimo lê
-- por aqui SEM ter acesso nenhum à tabela de produtos (onde ficam comissão,
-- receita, custo de mídia e o link de afiliado cru).
create view achadinhos_produtos_publicos as
  select
    id, nome, slug, descricao, categoria,
    imagem_principal, imagens, video_url,
    preco_atual, preco_anterior, desconto_percentual,
    origem, tags, destaque, selo, score, ordem,
    informacoes, observacoes,
    seo_titulo, seo_descricao, imagem_og,
    created_at, updated_at
  from achadinhos_produtos
  where status = 'ativo' and excluido_em is null;

grant select on achadinhos_produtos_publicos to anon, authenticated;

-- ---- Storage (imagens enviadas pelo painel) ----
-- Bucket público pra leitura (as imagens aparecem no site). Escrita só
-- pra equipe autenticada — mesma política dos outros buckets públicos
-- do sistema (ver fase 133).
insert into storage.buckets (id, name, public) values ('achadinhos', 'achadinhos', true)
  on conflict (id) do nothing;

create policy "achadinhos_leitura_publica" on storage.objects for select
  using (bucket_id = 'achadinhos');
create policy "achadinhos_staff_upload" on storage.objects for insert
  with check (bucket_id = 'achadinhos' and auth.role() = 'authenticated');
create policy "achadinhos_staff_update" on storage.objects for update
  using (bucket_id = 'achadinhos' and auth.role() = 'authenticated');
create policy "achadinhos_staff_delete" on storage.objects for delete
  using (bucket_id = 'achadinhos' and auth.role() = 'authenticated');
