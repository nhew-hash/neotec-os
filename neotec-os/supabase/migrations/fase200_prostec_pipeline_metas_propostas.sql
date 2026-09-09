-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 200 (Supabase / PostgreSQL)
-- Expansão grande do Prostec: pipeline completo (reunião, qualificado,
-- perdido com motivo), metas de vendedor, propostas rastreáveis,
-- atividades, sequências de follow-up automático.
-- ============================================================================

create table if not exists prostec_motivos_perda (
  id uuid primary key default gen_random_uuid(),
  motivo text not null unique
);

insert into prostec_motivos_perda (motivo) values
  ('Preço'), ('Sem interesse'), ('Já possui fornecedor'), ('Já possui site'),
  ('Não respondeu'), ('Momento inadequado'), ('Concorrente'), ('Outro')
on conflict (motivo) do nothing;

alter table prostec_leads add column if not exists motivo_perda text;
alter table prostec_leads add column if not exists valor_potencial numeric(12,2);
alter table prostec_leads add column if not exists proximo_followup_em timestamptz;

-- Pipeline novo, alinhado com a visão do documento (Novo → Contatado
-- → Qualificado → Reunião → Proposta → Negociação → Fechado, com
-- Perdido sempre com motivo). Migra os leads que já existiam com o
-- pipeline mais granular anterior pro equivalente mais simples.
update prostec_settings set status_disponiveis = array[
  'novo','contato_realizado','qualificado','reuniao',
  'proposta_enviada','negociacao','venda_fechada','perdido'
] where id = 'default';

update prostec_leads set status = 'perdido', motivo_perda = 'Sem interesse' where status = 'sem_interesse';
update prostec_leads set status = 'perdido', motivo_perda = 'Não respondeu' where status in ('nao_atendeu', 'numero_invalido');
update prostec_leads set status = 'qualificado' where status = 'interessado';
update prostec_leads set status = 'contato_realizado' where status = 'retornar_depois';

create table if not exists prostec_metas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  mes date not null,
  valor_meta numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, mes)
);

create table if not exists prostec_propostas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prostec_leads(id) on delete cascade,
  criado_por uuid references usuarios(id),
  produto text not null,
  valor numeric(12,2) not null,
  forma_pagamento text,
  status text not null default 'enviada' check (status in ('enviada', 'visualizada', 'aceita', 'recusada')),
  token_publico text not null unique default encode(gen_random_bytes(16), 'hex'),
  visualizacoes integer not null default 0,
  primeira_visualizacao_em timestamptz,
  ultima_visualizacao_em timestamptz,
  respondida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_prostec_propostas_lead on prostec_propostas(lead_id);
create index if not exists idx_prostec_propostas_token on prostec_propostas(token_publico);

create table if not exists prostec_atividades (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references prostec_leads(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  tipo text not null,
  descricao text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_prostec_atividades_created on prostec_atividades(created_at desc);

alter table prostec_metas enable row level security;
alter table prostec_propostas enable row level security;
alter table prostec_atividades enable row level security;
alter table prostec_motivos_perda enable row level security;

create policy "prostec_metas_staff" on prostec_metas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_propostas_staff" on prostec_propostas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_atividades_staff" on prostec_atividades for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_motivos_perda_staff" on prostec_motivos_perda for select using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

create policy "prostec_propostas_public_select" on prostec_propostas for select
  to anon using (true);
create policy "prostec_propostas_public_update_visualizacao" on prostec_propostas for update
  to anon using (true);

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 200
-- ============================================================================
