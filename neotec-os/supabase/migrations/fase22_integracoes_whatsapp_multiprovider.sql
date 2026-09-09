-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 22 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: suporte a múltiplos provedores de WhatsApp
-- (Meta Cloud API oficial + WhatsApp Web via QR Code).
--
-- DECISÃO DE ARQUITETURA (ver ARCHITECTURE.md): o serviço que mantém a
-- conexão do WhatsApp Web viva (Baileys) NÃO roda dentro do Neotec OS —
-- Vercel é serverless, não sustenta uma conexão WebSocket permanente.
-- Ele roda num serviço à parte ("Bridge"), sempre ligado, e conversa com
-- o Neotec OS só por HTTP autenticado. Esta tabela é o estado dessa
-- conexão, visto do lado do Neotec OS.
-- ============================================================================

create type whatsapp_provider_tipo as enum ('meta_cloud', 'whatsapp_web');
create type status_conexao_whatsapp as enum ('desconectado', 'conectando', 'aguardando_qr', 'conectado', 'erro');

create table integracoes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  provider whatsapp_provider_tipo not null default 'meta_cloud',
  status status_conexao_whatsapp not null default 'desconectado',
  numero text,
  session_id text,
  qr_code text,
  mensagens_hoje integer not null default 0,
  ultima_conexao timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id)
);

create trigger trg_integracoes_whatsapp_updated_at
  before update on integracoes_whatsapp
  for each row execute function set_updated_at();

-- Uma linha padrão pra loja existente, já em Meta Cloud (comportamento
-- atual do sistema não muda por padrão).
insert into integracoes_whatsapp (loja_id, provider, status)
select id, 'meta_cloud', 'desconectado' from lojas
on conflict (loja_id) do nothing;

alter table integracoes_whatsapp enable row level security;

-- Configuração sensível — só quem administra a loja mexe nisso.
create policy "integracoes_whatsapp_admin_gerente_all" on integracoes_whatsapp for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Incrementa o contador de mensagens do dia (indicador visual do card do
-- Dashboard, não é dado crítico — sem controle de fuso/zerar à meia-noite
-- por enquanto, é só "quantas mensagens chegaram desde que isso foi
-- zerado pela última vez").
create or replace function incrementar_mensagens_hoje_whatsapp_web()
returns void
language sql
security definer
set search_path = public
as $$
  update integracoes_whatsapp
  set mensagens_hoje = mensagens_hoje + 1
  where provider = 'whatsapp_web';
$$;

grant execute on function incrementar_mensagens_hoje_whatsapp_web() to authenticated, service_role;

-- Habilita Realtime nesta tabela — é o que permite a tela de
-- Configurações e o card do Dashboard atualizarem status/QR Code
-- sozinhos, sem precisar recarregar a página.
alter publication supabase_realtime add table integracoes_whatsapp;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 22
-- ============================================================================
