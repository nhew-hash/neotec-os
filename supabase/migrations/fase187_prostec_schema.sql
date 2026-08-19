-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 187 (Supabase / PostgreSQL)
-- Fusão do Neotec Prospector (prospecção B2B de venda de site) pra
-- dentro do Neotec OS. Tabelas prefixadas com "prostec_" — nunca
-- colidem com nada que já existe.
--
-- "users" do Prospector NÃO é portado — login agora é o mesmo
-- `usuarios` do Neotec OS (cargo 'vendedor_prostec' ou 'admin'/
-- 'gerente' pra quem supervisiona os dois lados).
-- ============================================================================

create table if not exists prostec_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  city text not null,
  state text not null,
  address text,
  phone text,
  whatsapp text,
  website text,
  instagram text,
  facebook text,
  google_profile_url text,
  rating numeric,
  reviews_count integer,
  opening_hours text,
  source text not null,
  collected_at timestamptz not null default now(),
  dedupe_key text not null,
  is_demo_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_prostec_companies_dedupe_key on prostec_companies (dedupe_key);
create index if not exists idx_prostec_companies_city_state on prostec_companies (city, state);

create table if not exists prostec_prospecting_searches (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  radius_km integer not null,
  segments text[] not null default '{}',
  quantity_requested integer not null,
  quantity_found integer not null default 0,
  status text not null default 'em_andamento' check (status in ('concluida', 'em_andamento', 'erro')),
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

create table if not exists prostec_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references prostec_companies(id) on delete cascade,
  search_id uuid references prostec_prospecting_searches(id),
  segment text not null,
  score integer not null default 0,
  temperature text not null default 'frio' check (temperature in ('quente', 'morno', 'frio')),
  status text not null default 'novo',
  assigned_to uuid references usuarios(id),
  site_analysis jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  approach_suggestion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);
create index if not exists idx_prostec_leads_score on prostec_leads (score desc);
create index if not exists idx_prostec_leads_status on prostec_leads (status);
create index if not exists idx_prostec_leads_assigned_to on prostec_leads (assigned_to);

create table if not exists prostec_lead_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references prostec_companies(id) on delete cascade,
  search_id uuid references prostec_prospecting_searches(id),
  source_name text not null,
  source_ref text,
  created_at timestamptz not null default now()
);

create table if not exists prostec_lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  score integer not null,
  breakdown jsonb not null default '[]'::jsonb,
  temperature text not null,
  computed_at timestamptz not null default now()
);

create table if not exists prostec_lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  user_id uuid references usuarios(id),
  contact_type text not null check (contact_type in ('ligacao', 'whatsapp', 'email', 'outro')),
  result text not null check (result in ('sem_resposta', 'atendeu', 'numero_invalido', 'interessado', 'sem_interesse')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists prostec_lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  user_id uuid references usuarios(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists prostec_lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  user_id uuid references usuarios(id),
  next_contact_date date not null,
  next_contact_time time,
  observation text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_prostec_followups_date on prostec_lead_followups (next_contact_date);

create table if not exists prostec_lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

create table if not exists prostec_sales (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  user_id uuid references usuarios(id),
  product text not null,
  amount numeric not null,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists prostec_commissions (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references prostec_sales(id) on delete cascade,
  user_id uuid references usuarios(id),
  pct numeric not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists prostec_settings (
  id text primary key default 'default',
  score_weights jsonb not null default '{}'::jsonb,
  score_quente_min integer not null default 80,
  score_morno_min integer not null default 60,
  segmentos_alta_necessidade text[] not null default '{}',
  segmentos_disponiveis text[] not null default '{}',
  cidades_sugeridas text[] not null default '{}',
  raio_padrao_km integer not null default 50,
  quantidade_padrao integer not null default 50,
  comissao_pct_padrao numeric not null default 10,
  valor_venda_padrao numeric not null default 1497,
  status_disponiveis text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into prostec_settings (id) values ('default') on conflict (id) do nothing;

alter table prostec_companies enable row level security;
alter table prostec_prospecting_searches enable row level security;
alter table prostec_leads enable row level security;
alter table prostec_lead_sources enable row level security;
alter table prostec_lead_scores enable row level security;
alter table prostec_lead_contacts enable row level security;
alter table prostec_lead_notes enable row level security;
alter table prostec_lead_followups enable row level security;
alter table prostec_lead_status_history enable row level security;
alter table prostec_sales enable row level security;
alter table prostec_commissions enable row level security;
alter table prostec_settings enable row level security;

create policy "prostec_companies_staff" on prostec_companies for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_searches_staff" on prostec_prospecting_searches for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_leads_staff" on prostec_leads for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_lead_sources_staff" on prostec_lead_sources for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_lead_scores_staff" on prostec_lead_scores for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_lead_contacts_staff" on prostec_lead_contacts for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_lead_notes_staff" on prostec_lead_notes for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_lead_followups_staff" on prostec_lead_followups for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_lead_status_history_staff" on prostec_lead_status_history for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_sales_staff" on prostec_sales for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_commissions_staff" on prostec_commissions for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_settings_staff" on prostec_settings for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 187
-- ============================================================================
