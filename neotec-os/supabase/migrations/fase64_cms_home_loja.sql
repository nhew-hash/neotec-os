-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 64 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: CMS interno da Home da loja — hero slider (tabela
-- própria, campos específicos) + seções reordenáveis genéricas
-- (banner, vitrine, categorias, trade-in, assistência, avaliações,
-- vídeo, instagram, texto), cada uma guardando sua configuração em
-- JSON. `data_inicio`/`data_fim` em ambas as tabelas é o mecanismo de
-- campanha sazonal sem precisar mexer em código — a seção só aparece
-- dentro da janela de data configurada.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('loja-cms', 'loja-cms', true)
on conflict (id) do nothing;

create table hero_slides (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  imagem_desktop_url text,
  imagem_mobile_url text,
  titulo text not null,
  subtitulo text,
  texto_botao text,
  link_botao text,
  prioridade integer not null default 0,
  ativo boolean not null default true,
  data_inicio timestamptz,
  data_fim timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hero_slides_ordem on hero_slides(loja_id, prioridade);

create trigger trg_hero_slides_updated_at
  before update on hero_slides
  for each row execute function set_updated_at();

create type tipo_secao_home as enum (
  'banner', 'vitrine_produtos', 'categorias', 'trade_in', 'assistencia',
  'avaliacoes', 'video', 'instagram', 'texto'
);

create table home_secoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  tipo tipo_secao_home not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  data_inicio timestamptz,
  data_fim timestamptz,
  -- Formato do JSON varia por `tipo` — validado na aplicação, não no
  -- banco (schema flexível de propósito, pra adicionar campo novo num
  -- tipo de bloco sem precisar de migration).
  configuracao jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_home_secoes_ordem on home_secoes(loja_id, ordem);

create trigger trg_home_secoes_updated_at
  before update on home_secoes
  for each row execute function set_updated_at();

alter table hero_slides enable row level security;
alter table home_secoes enable row level security;

create policy "hero_slides_admin_gerente_write" on hero_slides for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "home_secoes_admin_gerente_write" on home_secoes for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Leitura pública (home da loja, sem sessão) — só o que está ativo e
-- dentro da janela de data. Mesma lógica das outras funções públicas
-- da loja (Fase 58/61): filtro de negócio embutido na função, nunca
-- RLS aberto pra "anon".
create or replace function listar_hero_slides_publico()
returns setof hero_slides
language sql
stable
security definer
set search_path = public
as $$
  select * from hero_slides
  where ativo = true
    and (data_inicio is null or data_inicio <= now())
    and (data_fim is null or data_fim >= now())
  order by prioridade asc;
$$;

grant execute on function listar_hero_slides_publico() to anon, authenticated;

create or replace function listar_home_secoes_publico()
returns setof home_secoes
language sql
stable
security definer
set search_path = public
as $$
  select * from home_secoes
  where ativo = true
    and (data_inicio is null or data_inicio <= now())
    and (data_fim is null or data_fim >= now())
  order by ordem asc;
$$;

grant execute on function listar_home_secoes_publico() to anon, authenticated;

alter publication supabase_realtime add table hero_slides;
alter publication supabase_realtime add table home_secoes;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 64
-- ============================================================================
