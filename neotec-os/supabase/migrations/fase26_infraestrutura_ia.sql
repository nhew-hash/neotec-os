-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 26 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: infraestrutura central de IA — configuração e logs
-- de uso, base pra qualquer módulo do sistema que precisar chamar IA
-- (Central de Cotações é o primeiro consumidor, não o único).
--
-- DECISÃO DE SEGURANÇA: a API Key em si NUNCA fica nesta tabela — vive
-- só em variável de ambiente (OPENAI_API_KEY, ANTHROPIC_API_KEY,
-- GEMINI_API_KEY), nunca trafega pro navegador. Esta tabela guarda só
-- comportamento (qual provedor, modelo, temperatura, limite de tokens,
-- prompt do sistema, ligado/desligado) — tudo isso sim é seguro trocar
-- pela tela sem precisar de novo deploy.
-- ============================================================================

create type ia_provider_tipo as enum ('openai', 'anthropic', 'gemini', 'local');

create table configuracoes_ia (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  provider ia_provider_tipo not null default 'openai',
  modelo text not null default 'gpt-4o-mini',
  ativo boolean not null default false,
  temperatura numeric(3,2) not null default 0.2 check (temperatura >= 0 and temperatura <= 2),
  limite_tokens integer not null default 4000,
  prompt_sistema text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id)
);

create trigger trg_configuracoes_ia_updated_at
  before update on configuracoes_ia
  for each row execute function set_updated_at();

insert into configuracoes_ia (loja_id, provider, modelo, ativo)
select id, 'openai', 'gpt-4o-mini', false from lojas
on conflict (loja_id) do nothing;

-- Log de toda chamada de IA — módulo que chamou, provedor, tokens,
-- custo estimado, duração, sucesso/erro. Base do "consumo estimado" na
-- tela de Configurações, e primeira coisa a olhar quando uma
-- interpretação sair errada.
create table ia_logs (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  modulo text not null,
  provider ia_provider_tipo not null,
  modelo text not null,
  tokens_entrada integer,
  tokens_saida integer,
  custo_estimado_usd numeric(10,5),
  duracao_ms integer,
  sucesso boolean not null,
  erro text,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_ia_logs_data on ia_logs(created_at desc);
create index idx_ia_logs_modulo on ia_logs(modulo, created_at desc);

-- Cache simples de resposta — preparado, usado quando o chamador passar
-- uma cache_key (não toda chamada se beneficia disso; texto de cotação
-- colado à mão raramente repete, mas outros módulos futuros podem).
create table ia_cache (
  cache_key text primary key,
  loja_id uuid not null default default_loja_id() references lojas(id),
  resposta text not null,
  created_at timestamptz not null default now(),
  expira_em timestamptz not null
);

create index idx_ia_cache_expira on ia_cache(expira_em);

alter table configuracoes_ia enable row level security;
alter table ia_logs enable row level security;
alter table ia_cache enable row level security;

create policy "configuracoes_ia_admin_gerente_all" on configuracoes_ia for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "ia_logs_admin_select" on ia_logs for select
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- ia_cache e insert/select de ia_logs são operações de infraestrutura
-- (feitas pelo serviço central com Service Role Key), não precisam de
-- policy de escrita pra usuário — mesma lógica já usada em whatsapp_logs.

alter publication supabase_realtime add table configuracoes_ia;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 26
-- ============================================================================
