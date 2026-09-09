-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 183 (Supabase / PostgreSQL)
-- Infraestrutura de Analytics da Loja Virtual — V1 simples e sólida.
-- Não existia NENHUM rastreamento de tráfego antes desta migração
-- (confirmado por busca completa no schema). Construído do zero,
-- pensado pra crescer depois (campos extras já previstos, mas não
-- usados na V1 — ex: utm_campaign, país/cidade).
-- ============================================================================

-- Uma sessão = um visitante (identificado por um ID gerado no
-- navegador, guardado em localStorage — sem cookie de rastreamento
-- cross-site, sem dado pessoal). "Online agora" = sessão com
-- última_atividade_em nos últimos 2 minutos.
create table loja_sessoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  sessao_uid text not null unique,
  origem text,
  primeira_pagina text,
  criado_em timestamptz not null default now(),
  ultima_atividade_em timestamptz not null default now()
);

create index idx_loja_sessoes_atividade on loja_sessoes(ultima_atividade_em);
create index idx_loja_sessoes_criado on loja_sessoes(criado_em);

create type tipo_evento_loja as enum ('pageview', 'add_to_cart');

create table loja_eventos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  sessao_uid text not null references loja_sessoes(sessao_uid) on delete cascade,
  tipo tipo_evento_loja not null,
  pagina text,
  produto_id uuid references produtos(id) on delete set null,
  aparelho_id uuid references aparelhos(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index idx_loja_eventos_criado on loja_eventos(criado_em);
create index idx_loja_eventos_tipo_criado on loja_eventos(tipo, criado_em);
create index idx_loja_eventos_produto on loja_eventos(produto_id) where produto_id is not null;

alter table loja_sessoes enable row level security;
alter table loja_eventos enable row level security;

create policy "loja_sessoes_insert_publico" on loja_sessoes for insert to anon, authenticated with check (true);
create policy "loja_sessoes_update_publico" on loja_sessoes for update to anon, authenticated using (true);
create policy "loja_sessoes_select_staff" on loja_sessoes for select to authenticated using (true);

create policy "loja_eventos_insert_publico" on loja_eventos for insert to anon, authenticated with check (true);
create policy "loja_eventos_select_staff" on loja_eventos for select to authenticated using (true);

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 183
-- ============================================================================
