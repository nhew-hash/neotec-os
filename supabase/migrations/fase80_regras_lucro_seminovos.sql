-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 80 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: regras de lucro configuráveis (fixo, percentual,
-- faixa) usadas pelo cadastro assistido por IA de seminovos, e campos
-- que faltavam em `aparelhos` pro que foi pedido (tela original, Face
-- ID, True Tone, vídeo).
-- ============================================================================

create type tipo_regra_lucro as enum ('fixo', 'percentual', 'faixa');

create table regras_lucro (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  tipo tipo_regra_lucro not null,
  valor_fixo numeric(12,2),        -- usado quando tipo = 'fixo'
  percentual numeric(5,2),         -- usado quando tipo = 'percentual'
  ativa boolean not null default true,
  padrao boolean not null default false, -- a regra usada quando ninguém escolhe explicitamente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_regras_lucro_updated_at
  before update on regras_lucro
  for each row execute function set_updated_at();

-- Faixas — só existem quando tipo = 'faixa' (uma regra de faixa tem várias linhas aqui).
create table regras_lucro_faixas (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references regras_lucro(id) on delete cascade,
  valor_ate numeric(12,2), -- null = "acima de", última faixa em aberto
  lucro numeric(12,2) not null,
  ordem integer not null default 0
);

alter table aparelhos
  add column if not exists tela_original boolean,
  add column if not exists face_id_ok boolean,
  add column if not exists true_tone_ok boolean,
  add column if not exists video_url text;

comment on column aparelhos.tela_original is 'null = não informado ainda; true = tela original de fábrica; false = tela trocada por peça não original.';

alter table regras_lucro enable row level security;
alter table regras_lucro_faixas enable row level security;

create policy "regras_lucro_admin_gerente_write" on regras_lucro for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());
create policy "regras_lucro_faixas_admin_gerente_write" on regras_lucro_faixas for all
  using (exists (select 1 from regras_lucro r where r.id = regras_lucro_faixas.regra_id and r.loja_id = current_user_loja_id()));

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 80
-- ============================================================================
