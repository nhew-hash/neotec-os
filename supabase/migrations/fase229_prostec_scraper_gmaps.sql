-- Fase 229 — Prostec: infraestrutura pro scraper próprio do Google
-- Maps (substitui a Google Places API). Migration idempotente: pode
-- rodar mais de uma vez sem erro.

-- ============================================================================
-- 1) Fila de buscas (substitui o "1 clique = 1 busca síncrona" pelo
--    modelo de fila que o cron processa uma de cada vez).
-- ============================================================================

do $$ begin
  create type prostec_scrape_job_status as enum (
    'fila', 'enviado', 'processando', 'importando', 'enriquecendo', 'concluido', 'erro', 'cancelado'
  );
exception when duplicate_object then null;
end $$;

create table if not exists prostec_scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  nicho text not null,
  cidade text not null,
  uf text,
  query text not null,
  lat numeric,
  lon numeric,
  raio_m integer not null default 10000,
  depth integer not null default 5,
  buscar_email boolean not null default false,
  buscar_redes boolean not null default true,
  status prostec_scrape_job_status not null default 'fila',
  job_externo_id text,
  erro text,
  tentativas integer not null default 0,
  total_encontrados integer not null default 0,
  total_novos integer not null default 0,
  total_duplicados integer not null default 0,
  total_bloqueados_optout integer not null default 0,
  criado_por uuid references usuarios(id),
  created_at timestamptz not null default now(),
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_prostec_scrape_jobs_status on prostec_scrape_jobs (status);
create index if not exists idx_prostec_scrape_jobs_created_at on prostec_scrape_jobs (created_at desc);

drop trigger if exists trg_prostec_scrape_jobs_updated_at on prostec_scrape_jobs;
create trigger trg_prostec_scrape_jobs_updated_at
  before update on prostec_scrape_jobs
  for each row execute function set_updated_at();

-- ============================================================================
-- 2) Cache de geocodificação (cidade+UF → lat/lon), com seed de Araguari/MG.
-- ============================================================================

create table if not exists prostec_geocode_cache (
  chave text primary key,
  lat numeric not null,
  lon numeric not null,
  fonte text not null default 'nominatim',
  created_at timestamptz not null default now()
);

insert into prostec_geocode_cache (chave, lat, lon, fonte)
values ('araguari|mg', -18.6489, -48.1875, 'seed')
on conflict (chave) do nothing;

-- ============================================================================
-- 3) prostec_companies — novas colunas pro scraper (mantém tudo que já
--    existe; nenhum dado histórico é apagado).
-- ============================================================================

do $$ begin
  create type prostec_origem_lead as enum ('gmaps_scraper', 'places_api_legado', 'manual', 'importacao');
exception when duplicate_object then null;
end $$;

alter table prostec_companies add column if not exists origem prostec_origem_lead;
alter table prostec_companies add column if not exists scrape_job_id uuid references prostec_scrape_jobs(id);
alter table prostec_companies add column if not exists gmaps_place_id text;
alter table prostec_companies add column if not exists gmaps_cid text;
alter table prostec_companies add column if not exists gmaps_link text;
alter table prostec_companies add column if not exists emails text[] not null default '{}';
alter table prostec_companies add column if not exists linkedin text;
alter table prostec_companies add column if not exists telefone_e164 text;
alter table prostec_companies add column if not exists enriquecido_em timestamptz;

-- Nota de design: `rating`, `reviews_count` e `category` já existiam
-- na Fase 187 com exatamente o mesmo significado de "nota",
-- "total_avaliacoes" e "categoria_gmaps" — por isso o scraper escreve
-- direto nessas colunas em vez de criar `nota`/`total_avaliacoes`/
-- `categoria_gmaps` duplicadas (ver docs/prostec/scraper-migracao.md).

create unique index if not exists idx_prostec_companies_gmaps_place_id
  on prostec_companies (gmaps_place_id) where gmaps_place_id is not null;
create index if not exists idx_prostec_companies_telefone_e164
  on prostec_companies (telefone_e164) where telefone_e164 is not null;
create index if not exists idx_prostec_companies_origem on prostec_companies (origem);

-- Backfill: tudo que já existia veio da Places API. Não há place_id
-- salvo historicamente (a integração antiga nunca persistiu esse
-- campo), então só marca a origem — não inventa um place_id que nunca
-- existiu.
update prostec_companies
set origem = 'places_api_legado'
where origem is null;

-- ============================================================================
-- 4) RLS — mesmo padrão das demais tabelas do Prostec (Fase 187).
-- ============================================================================

alter table prostec_scrape_jobs enable row level security;
alter table prostec_geocode_cache enable row level security;

drop policy if exists "prostec_scrape_jobs_staff" on prostec_scrape_jobs;
create policy "prostec_scrape_jobs_staff" on prostec_scrape_jobs
  for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

-- Cache de geocodificação não tem dado sensível nenhum (só cidade →
-- lat/lon) e o serviço server-only usa a chave de serviço pra
-- ler/gravar de qualquer forma — mesmo assim mantém RLS ligado e
-- restrito à equipe, por padrão de segurança.
drop policy if exists "prostec_geocode_cache_staff" on prostec_geocode_cache;
create policy "prostec_geocode_cache_staff" on prostec_geocode_cache
  for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

notify pgrst, 'reload schema';
