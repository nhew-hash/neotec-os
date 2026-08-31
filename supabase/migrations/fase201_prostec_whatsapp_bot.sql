-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 201 (Supabase / PostgreSQL)
-- WhatsApp + Bot SDR da Prostec — número PRÓPRIO, nunca misturado com
-- o WhatsApp da loja (cliente de celular e lead B2B são públicos
-- completamente diferentes). Reaproveita a MESMA infraestrutura de IA
-- (configuracoes_ia) já usada pela Iara — o provedor de IA em si
-- (Claude/GPT/Gemini) não é específico de loja, é só uma chave de API.
-- ============================================================================

create table if not exists integracoes_whatsapp_prostec (
  id uuid primary key default gen_random_uuid(),
  phone_number_id text,
  access_token text,
  numero text,
  status text not null default 'desconectado' check (status in ('conectado', 'desconectado', 'erro')),
  ultima_conexao timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into integracoes_whatsapp_prostec (status) select 'desconectado' where not exists (select 1 from integracoes_whatsapp_prostec);

create table if not exists prostec_conversas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references prostec_leads(id) on delete set null,
  telefone text not null unique,
  status text not null default 'aberta' check (status in ('aberta', 'aguardando', 'encerrada')),
  bot_ativo boolean not null default true,
  responsavel_id uuid references usuarios(id),
  etapa_bot text not null default 'abertura',
  nao_lidas integer not null default 0,
  ultima_mensagem_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_prostec_conversas_telefone on prostec_conversas(telefone);
create index if not exists idx_prostec_conversas_lead on prostec_conversas(lead_id);

create table if not exists prostec_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references prostec_conversas(id) on delete cascade,
  remetente text not null check (remetente in ('lead', 'bot', 'vendedor')),
  conteudo text not null,
  ia_gerada boolean not null default false,
  enviada_em timestamptz not null default now()
);
create index if not exists idx_prostec_mensagens_conversa on prostec_mensagens(conversa_id, enviada_em);

create trigger trg_integracoes_whatsapp_prostec_updated_at
  before update on integracoes_whatsapp_prostec
  for each row execute function set_updated_at();

create trigger trg_prostec_conversas_updated_at
  before update on prostec_conversas
  for each row execute function set_updated_at();

alter table integracoes_whatsapp_prostec enable row level security;
alter table prostec_conversas enable row level security;
alter table prostec_mensagens enable row level security;

create policy "integracoes_whatsapp_prostec_admin" on integracoes_whatsapp_prostec for all using (current_user_cargo() in ('admin', 'gerente'));
create policy "prostec_conversas_staff" on prostec_conversas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_mensagens_staff" on prostec_mensagens for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 201
-- ============================================================================
