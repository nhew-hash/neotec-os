-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 264 (Supabase / PostgreSQL)
-- Achadinhos da Neotec — dados da "fábrica" de conteúdo.
--
-- 100% aditiva: duas tabelas NOVAS e colunas NOVAS (todas opcionais) em
-- achadinhos_produtos. Nada existente muda de comportamento; a view pública
-- não muda (as colunas novas são internas).
--
--  * achadinhos_candidatos: produtos achados na captação (API do Mercado
--    Livre) ANTES de virarem produto do catálogo. Passam pela peneira
--    (score/classe), esperam o link de afiliado (gerado à mão no Gerador de
--    Links do ML — o sistema nunca monta link) e, quando cadastrados,
--    apontam pro produto criado.
--  * achadinhos_precos: histórico de preço conferido na API do ML, pra
--    detectar preço que mudou depois do vídeo pronto.
--  * achadinhos_produtos: ids do ML, classe de mídia (A/B/C/D) e o detalhe do
--    score (notas e motivos da peneira).
--
-- Mesma segurança da fase 263: escrita só pelo servidor (service role, via
-- executarFerramenta) e leitura pra admin/gerente da loja. Sem leitura
-- pública. Sem DELETE físico de produto (FK RESTRICT).
-- ============================================================================

-- ---- Colunas novas no produto ----
alter table achadinhos_produtos
  add column if not exists ml_catalog_id text,
  add column if not exists ml_item_id text,
  add column if not exists midia_classe text,
  add column if not exists score_detalhe jsonb;

alter table achadinhos_produtos
  add constraint achadinhos_midia_classe_valida check (midia_classe is null or midia_classe in ('A', 'B', 'C', 'D'));

create index if not exists idx_achadinhos_produtos_ml_catalog on achadinhos_produtos (loja_id, ml_catalog_id)
  where ml_catalog_id is not null;

-- ---- Candidatos (captação + peneira) ----
create table achadinhos_candidatos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),

  ml_catalog_id text not null,
  ml_item_id text,
  nome text not null,
  categoria text,
  -- Preços como vieram da API do ML. `preco_anterior_oficial` só quando o
  -- próprio anúncio informa (original_price) — nunca estimado.
  preco numeric(12,2),
  preco_anterior_oficial numeric(12,2),
  fotos jsonb not null default '[]'::jsonb,
  tem_video boolean not null default false,
  url_produto text,

  status text not null default 'ENCONTRADO',
  product_score numeric(6,2),
  classe text,
  notas jsonb,
  motivos jsonb,
  motivo_descarte text,
  link_afiliado text,
  produto_id uuid references achadinhos_produtos(id) on delete restrict,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (loja_id, ml_catalog_id),
  constraint achadinhos_candidato_status_valido check (status in (
    'ENCONTRADO', 'ANALISANDO', 'DESCARTADO', 'SELECIONADO', 'AGUARDANDO_LINK', 'LINK_OK', 'LINK_ERRO', 'CADASTRADO'
  )),
  constraint achadinhos_candidato_classe_valida check (classe is null or classe in ('A', 'B', 'C', 'D')),
  constraint achadinhos_candidato_link_https check (link_afiliado is null or link_afiliado ~* '^https://'),
  constraint achadinhos_candidato_preco_ok check (preco is null or preco >= 0),
  constraint achadinhos_candidato_preco_anterior_ok check (preco_anterior_oficial is null or preco_anterior_oficial >= 0),
  constraint achadinhos_candidato_fotos_array check (jsonb_typeof(fotos) = 'array')
);

create index idx_achadinhos_candidatos_fila on achadinhos_candidatos (loja_id, status, product_score desc nulls last, criado_em desc);

create or replace function achadinhos_candidatos_touch()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_achadinhos_candidatos_atualizado before update on achadinhos_candidatos
  for each row execute function achadinhos_candidatos_touch();

-- ---- Histórico de preço ----
create table achadinhos_precos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  produto_id uuid not null references achadinhos_produtos(id) on delete restrict,
  preco numeric(12,2),
  preco_anterior numeric(12,2),
  disponivel boolean not null default true,
  origem text not null default 'api_ml',
  coletado_em timestamptz not null default now(),
  constraint achadinhos_precos_preco_ok check (preco is null or preco >= 0)
);

create index idx_achadinhos_precos_produto on achadinhos_precos (produto_id, coletado_em desc);

-- ---- RLS ----
alter table achadinhos_candidatos enable row level security;
alter table achadinhos_precos enable row level security;

create policy "achadinhos_candidatos_staff_all" on achadinhos_candidatos for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "achadinhos_precos_staff_select" on achadinhos_precos for select
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());
