-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 259 (Supabase / PostgreSQL)
-- NEO PERFORMANCE — Fase 1: Fundação, Dados, Atribuição e Cérebro Analítico
--
-- Aditivo: não remove, não recria e não quebra nada existente.
--
-- O que já existe e é REUTILIZADO aqui, sem duplicar (Regra Zero):
--   - `vendas.lucro` e `vendas.valor_total` → margem/lucro por venda já
--     são calculados na venda; o módulo de performance só AGREGA esses
--     valores por campanha/período, nunca recalcula do zero.
--   - `crm_cards.origem` (enum origem_cliente) → continua sendo a origem
--     "humana" do lead (instagram/google/indicacao/loja_fisica/shopify/
--     outros). A atribuição de campanha granular (UTM, fbclid, gclid,
--     campaign_id/ad_id) é um nível de detalhe que não existia e entra
--     numa tabela nova (`attribution_eventos`), ligada por cliente_id —
--     não mexe em crm_cards.
--   - `loja_sessoes` (Fase 183) → já rastreia sessão/origem do
--     e-commerce. Em vez de criar uma tabela de sessão paralela, só
--     ADICIONA as colunas de UTM/click-id que faltavam nela.
--   - `current_user_loja_id()` / `current_user_cargo()` (Fase 3) →
--     mesmas funções de RLS multi-tenant usadas em todo o resto do
--     sistema. `default_loja_id()` para o default de loja_id (mesmo
--     padrão de `banco_imagens_fotos`, `loja_sessoes`, etc).
--
-- Tudo aqui é dado NOVO (tabelas e colunas que não existiam). Nenhuma
-- tabela, policy ou função existente é alterada em seu comportamento.
-- ============================================================================


-- ============================================================================
-- 0. FEATURE FLAGS (Seção 62 do prompt mestre)
-- Liga/desliga progressivamente cada pedaço do NEO PERFORMANCE sem precisar
-- de deploy novo. Só `neo_performance` nasce ativa (mostra o módulo vazio);
-- as demais nascem desligadas até cada parte ser implementada/testada.
-- ============================================================================
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  chave text not null,
  ativo boolean not null default false,
  descricao text,
  updated_at timestamptz not null default now(),
  unique (loja_id, chave)
);

create trigger trg_feature_flags_updated_at
  before update on feature_flags
  for each row execute function set_updated_at();

alter table feature_flags enable row level security;

create policy "feature_flags_admin_all" on feature_flags for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id())
  with check (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

create policy "feature_flags_select_gerente" on feature_flags for select
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

insert into feature_flags (loja_id, chave, ativo, descricao)
select default_loja_id(), chave, ativo, descricao
from (values
  ('neo_performance', true, 'Mostra o módulo NEO Performance no menu'),
  ('meta_ads', false, 'Sincronização real com Meta Ads (precisa de token configurado)'),
  ('google_ads', false, 'Sincronização real com Google Ads (precisa de credenciais)'),
  ('attribution', true, 'Captura de UTM/fbclid/gclid em novas sessões e leads'),
  ('creative_intelligence', false, 'Fase 2 — ainda não implementada'),
  ('creative_factory', false, 'Fase 2 — ainda não implementada'),
  ('gemini', false, 'Fase 2 — geração de criativos (precisa de GEMINI_API_KEY)'),
  ('automation_engine', false, 'Fase 3 — ainda não implementada'),
  ('autonomous_mode', false, 'Fase 3 — kill switch global; nasce sempre desligado'),
  ('ecommerce_intelligence', false, 'Fase 4 — ainda não implementada'),
  ('competitor_intelligence', false, 'Fase 4 — ainda não implementada'),
  ('multi_tenant', false, 'Painel cross-loja para múltiplos clientes — Fase 4')
) as f(chave, ativo, descricao)
on conflict (loja_id, chave) do nothing;


-- ============================================================================
-- 1. PERFIL DE PERFORMANCE + LIMITES DE ORÇAMENTO (Seções 2 e 3)
-- Uma linha por loja. Nada hardcoded: tudo aqui é editável pelo admin na
-- tela de configuração do módulo.
-- ============================================================================
create table if not exists neo_performance_config (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id) unique,

  -- Perfil da empresa
  segmento text,
  cidades text[] not null default '{}',
  regioes text[] not null default '{}',
  ticket_medio_alvo numeric(12,2),
  margem_media_alvo numeric(5,2),
  cac_desejado numeric(12,2),
  meta_faturamento_mensal numeric(12,2),
  meta_vendas_mensal integer,
  canais text[] not null default '{}',
  objetivos text,
  horario_atendimento text,

  -- Limites de orçamento (Seção 2) — nenhuma automação da Fase 3+ pode
  -- gastar além destes valores; a Fase 1 só guarda e exibe.
  limite_diario numeric(12,2),
  limite_semanal numeric(12,2),
  limite_mensal numeric(12,2),
  limite_por_campanha numeric(12,2),
  max_aumento_automatico_pct numeric(5,2),
  max_reducao_automatica_pct numeric(5,2),
  cac_maximo numeric(12,2),
  margem_minima_pct numeric(5,2),
  roas_minimo numeric(5,2),

  updated_at timestamptz not null default now()
);

create trigger trg_neo_performance_config_updated_at
  before update on neo_performance_config
  for each row execute function set_updated_at();

alter table neo_performance_config enable row level security;

create policy "neo_performance_config_admin_gerente" on neo_performance_config for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

insert into neo_performance_config (loja_id)
values (default_loja_id())
on conflict (loja_id) do nothing;


-- ============================================================================
-- 2. META ADS + GOOGLE ADS (Seções 4 e 5)
-- Schema único pras duas plataformas (`plataforma`) — o prompt mestre pede
-- explicitamente que o banco já suporte Google desde a Fase 1, mesmo que a
-- sincronização real do Google só chegue na Fase 4. Isso evita duplicar
-- estrutura quando o Google entrar de verdade.
-- ============================================================================
create type plataforma_ads as enum ('meta', 'google');
create type status_sync_ads as enum ('pendente', 'sucesso', 'erro');

create table if not exists ads_contas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  plataforma plataforma_ads not null,
  conta_externa_id text not null,
  nome text,
  ativo boolean not null default false,
  -- O token de acesso NUNCA fica no banco (regra 61: "não colocar secrets
  -- no frontend" e, por extensão, nem em tabela sem necessidade). Vive em
  -- env var (ver .env.local.example: faltam as chaves de Meta/Google —
  -- dependência externa real, fora do que o código pode resolver sozinho).
  -- Esta coluna só guarda METADADO de qual conta está conectada.
  conectado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (loja_id, plataforma, conta_externa_id)
);

alter table ads_contas enable row level security;
create policy "ads_contas_admin_gerente" on ads_contas for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create table if not exists ads_campanhas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  conta_id uuid not null references ads_contas(id) on delete cascade,
  plataforma plataforma_ads not null,
  external_campaign_id text not null,
  nome text not null,
  objetivo text,
  status text,
  orcamento_diario numeric(12,2),
  -- Qual operação essa campanha serve (Seção "OPERAÇÃO LOCAL" x
  -- "OPERAÇÃO E-COMMERCE") — cada uma com métricas/estratégia própria.
  operacao text check (operacao in ('local', 'ecommerce')) default 'local',
  created_at timestamptz not null default now(),
  unique (conta_id, external_campaign_id)
);

create index idx_ads_campanhas_loja on ads_campanhas(loja_id);

alter table ads_campanhas enable row level security;
create policy "ads_campanhas_admin_gerente" on ads_campanhas for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Histórico diário — nunca sobrescrito, por decisão explícita do prompt
-- mestre ("NÃO depender apenas dos dados atuais da API. Criar
-- armazenamento histórico."). Uma linha por campanha/dia.
create table if not exists ads_metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references ads_campanhas(id) on delete cascade,
  data date not null,
  gasto numeric(12,2) not null default 0,
  impressoes bigint not null default 0,
  alcance bigint not null default 0,
  frequencia numeric(6,2),
  cliques bigint not null default 0,
  cpm numeric(10,2),
  ctr numeric(6,3),
  cpc numeric(10,2),
  leads integer not null default 0,
  conversas integer not null default 0,
  conversoes integer not null default 0,
  compras integer not null default 0,
  custo_por_resultado numeric(10,2),
  valor_conversao numeric(12,2),
  created_at timestamptz not null default now(),
  unique (campanha_id, data)
);

create index idx_ads_metricas_data on ads_metricas_diarias(data);

alter table ads_metricas_diarias enable row level security;
create policy "ads_metricas_select_admin_gerente" on ads_metricas_diarias for select
  using (
    current_user_cargo() in ('admin', 'gerente')
    and exists (select 1 from ads_campanhas c where c.id = ads_metricas_diarias.campanha_id and c.loja_id = current_user_loja_id())
  );
create policy "ads_metricas_write_admin_gerente" on ads_metricas_diarias for insert
  with check (
    current_user_cargo() in ('admin', 'gerente')
    and exists (select 1 from ads_campanhas c where c.id = ads_metricas_diarias.campanha_id and c.loja_id = current_user_loja_id())
  );
create policy "ads_metricas_update_admin_gerente" on ads_metricas_diarias for update
  using (
    current_user_cargo() in ('admin', 'gerente')
    and exists (select 1 from ads_campanhas c where c.id = ads_metricas_diarias.campanha_id and c.loja_id = current_user_loja_id())
  );

-- Log de sincronização (Seção 4: "registrar data da última sincronização,
-- status, erros, histórico").
create table if not exists ads_sync_log (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references ads_contas(id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  status status_sync_ads not null default 'pendente',
  erro text,
  campanhas_sincronizadas integer not null default 0
);

alter table ads_sync_log enable row level security;
create policy "ads_sync_log_select_admin_gerente" on ads_sync_log for select
  using (
    current_user_cargo() in ('admin', 'gerente')
    and exists (select 1 from ads_contas a where a.id = ads_sync_log.conta_id and a.loja_id = current_user_loja_id())
  );


-- ============================================================================
-- 3. ATTRIBUTION ENGINE (Seção 6)
-- Um evento de atribuição por "toque" relevante do lead (pode haver mais de
-- um por cliente — primeiro toque e último toque, Seção 6 pede os dois).
-- Ligado por cliente_id, nunca mexe em `clientes` nem em `crm_cards`.
-- ============================================================================
create table if not exists attribution_eventos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid references clientes(id) on delete cascade,
  card_id uuid references crm_cards(id) on delete set null,

  source text,
  medium text,
  campaign text,
  campaign_id text,
  adset text,
  adset_id text,
  ad text,
  ad_id text,
  keyword text,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,

  criado_em timestamptz not null default now()
);

create index idx_attribution_cliente on attribution_eventos(cliente_id);
create index idx_attribution_campaign_id on attribution_eventos(campaign_id) where campaign_id is not null;
create index idx_attribution_criado on attribution_eventos(criado_em);

alter table attribution_eventos enable row level security;

-- Insert é liberado (o evento nasce no primeiro contato — webhook do
-- WhatsApp, formulário público, etc. — sem sessão de staff autenticada,
-- mesmo caso do webhook da Meta em whatsapp.service.ts). Leitura fica
-- restrita, porque é dado de campanha/custo.
create policy "attribution_insert_sistema" on attribution_eventos for insert
  with check (loja_id = default_loja_id());
create policy "attribution_select_admin_gerente" on attribution_eventos for select
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());


-- ============================================================================
-- 4. E-COMMERCE — reaproveita `loja_sessoes` (Fase 183) em vez de criar
-- tabela paralela. Só adiciona as colunas de atribuição que faltavam.
-- ============================================================================
alter table loja_sessoes add column if not exists utm_source text;
alter table loja_sessoes add column if not exists utm_medium text;
alter table loja_sessoes add column if not exists utm_campaign text;
alter table loja_sessoes add column if not exists utm_content text;
alter table loja_sessoes add column if not exists utm_term text;
alter table loja_sessoes add column if not exists fbclid text;
alter table loja_sessoes add column if not exists gclid text;


-- ============================================================================
-- 5. PRIMEIRO CÉREBRO ANALÍTICO (Seção 11)
-- Saída das regras de diagnóstico determinísticas (CAC elevado, criativo em
-- fadiga, conversas sem venda, venda sem margem, campanha eficiente).
-- Fase 1 é só leitura/sinalização — nenhuma ação é executada a partir daqui.
-- ============================================================================
create type tipo_diagnostico_performance as enum (
  'cac_elevado', 'criativo_fadiga', 'conversas_sem_venda', 'venda_sem_margem', 'campanha_eficiente'
);
create type severidade_diagnostico as enum ('info', 'atencao', 'critico');

create table if not exists performance_diagnosticos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  campanha_id uuid references ads_campanhas(id) on delete cascade,
  tipo tipo_diagnostico_performance not null,
  severidade severidade_diagnostico not null default 'atencao',
  mensagem text not null,
  dados jsonb not null default '{}',
  status text not null default 'aberto' check (status in ('aberto', 'resolvido', 'ignorado')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

create index idx_performance_diagnosticos_status on performance_diagnosticos(status);
create index idx_performance_diagnosticos_campanha on performance_diagnosticos(campanha_id);

alter table performance_diagnosticos enable row level security;
create policy "performance_diagnosticos_admin_gerente" on performance_diagnosticos for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());


-- ============================================================================
-- 6. CENTRO DE DECISÕES DA IA (Seção 10)
-- Fase 1 só cria a estrutura de registro. Nenhum agente decide ou executa
-- nada sozinho ainda (isso é Fase 3 — Automation Engine + kill switch).
-- ============================================================================
create table if not exists performance_decisoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  campanha_id uuid references ads_campanhas(id) on delete set null,
  agente text not null default 'manual',
  tipo_decisao text not null,
  motivo text not null,
  dados_utilizados jsonb not null default '{}',
  acao text,
  resultado_esperado text,
  resultado_posterior text,
  status text not null default 'registrado' check (status in ('registrado', 'executado', 'aguardando_avaliacao', 'avaliado')),
  criado_em timestamptz not null default now()
);

create index idx_performance_decisoes_campanha on performance_decisoes(campanha_id);

alter table performance_decisoes enable row level security;
create policy "performance_decisoes_admin_gerente" on performance_decisoes for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 259
-- ============================================================================
