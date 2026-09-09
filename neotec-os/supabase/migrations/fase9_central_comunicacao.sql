-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 9 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Central de Comunicação (WhatsApp) + CRM configurável.
--
-- DECISÃO ARQUITETURAL (ver ARCHITECTURE.md para o racional completo):
-- Esta migração NÃO apaga nem renomeia `conversas`, `mensagens` ou
-- `retornos` (Fase 1). Elas continuam existindo e o `/crm` atual continua
-- funcionando exatamente como está. As tabelas novas (`whatsapp_*`,
-- `crm_*`) são uma evolução arquitetural que substitui o papel daquelas
-- tabelas SOMENTE em código novo daqui pra frente — é uma sucessão, não
-- uma migração de dado. Consolidar as duas gerações em uma só é decisão
-- de uma fase futura, feita com calma, não como parte desta entrega.
-- ============================================================================

-- ============================================================================
-- 1. CRM CONFIGURÁVEL — etapas, cards, tags, follow-ups
-- ============================================================================

create table crm_etapas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  ordem integer not null,
  cor text not null default '#2643D6',
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (loja_id, ordem)
);

create index idx_crm_etapas_loja on crm_etapas(loja_id, ordem);

create table crm_tags (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  cor text not null default '#6B7280',
  created_at timestamptz not null default now(),
  unique (loja_id, nome)
);

create table crm_cards (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid not null references clientes(id) on delete cascade,
  etapa_id uuid not null references crm_etapas(id),
  titulo text not null,
  valor_estimado numeric(12,2),
  responsavel_id uuid references usuarios(id),
  origem origem_cliente,
  entrou_etapa_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_crm_cards_etapa on crm_cards(etapa_id);
create index idx_crm_cards_cliente on crm_cards(cliente_id);
create index idx_crm_cards_responsavel on crm_cards(responsavel_id);

create trigger trg_crm_cards_updated_at
  before update on crm_cards
  for each row execute function set_updated_at();

-- Atualiza entrou_etapa_em sempre que o card muda de etapa — é o que
-- permite calcular "tempo parado nesta etapa" sem guardar histórico à parte.
create or replace function trg_fn_crm_card_mudou_etapa()
returns trigger
language plpgsql
as $$
begin
  if new.etapa_id is distinct from old.etapa_id then
    new.entrou_etapa_em := now();
  end if;
  return new;
end;
$$;

create trigger trg_crm_card_mudou_etapa
  before update on crm_cards
  for each row execute function trg_fn_crm_card_mudou_etapa();

create table crm_card_tags (
  card_id uuid not null references crm_cards(id) on delete cascade,
  tag_id uuid not null references crm_tags(id) on delete cascade,
  primary key (card_id, tag_id)
);

-- Follow-up genérico de um CARD (não de um cliente direto, como `retornos`
-- da Fase 1) — permite mais de um follow-up por oportunidade em curso,
-- e followups seguem o card mesmo que o cliente tenha múltiplos cards.
create type status_followup as enum ('pendente', 'concluido', 'cancelado');

create table crm_followups (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references crm_cards(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  data_agendada timestamptz not null,
  motivo text not null,
  status status_followup not null default 'pendente',
  created_at timestamptz not null default now()
);

create index idx_crm_followups_card on crm_followups(card_id);
create index idx_crm_followups_data on crm_followups(data_agendada) where status = 'pendente';

-- ============================================================================
-- 2. COMUNICAÇÃO — conversas, mensagens, templates, logs
-- ============================================================================

create type status_conversa_whatsapp as enum ('aberta', 'aguardando_cliente', 'resolvida', 'perdida');
create type direcao_mensagem as enum ('entrada', 'saida');
create type tipo_mensagem_whatsapp as enum ('texto', 'imagem', 'documento', 'audio', 'template');
create type status_entrega_mensagem as enum ('enviando', 'enviado', 'entregue', 'lido', 'erro');
create type status_aprovacao_template as enum ('rascunho', 'em_analise', 'aprovado', 'rejeitado');

create table whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid references clientes(id),
  card_id uuid references crm_cards(id),
  telefone text not null,
  status status_conversa_whatsapp not null default 'aberta',
  responsavel_id uuid references usuarios(id),
  nao_lidas integer not null default 0,
  ultima_mensagem_em timestamptz,
  primeira_resposta_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_whatsapp_conversas_cliente on whatsapp_conversas(cliente_id);
create index idx_whatsapp_conversas_telefone on whatsapp_conversas(telefone);
create index idx_whatsapp_conversas_status on whatsapp_conversas(status);

create trigger trg_whatsapp_conversas_updated_at
  before update on whatsapp_conversas
  for each row execute function set_updated_at();

create table whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  categoria text not null,
  idioma text not null default 'pt_BR',
  corpo text not null,
  variaveis jsonb not null default '[]'::jsonb,
  status_aprovacao status_aprovacao_template not null default 'rascunho',
  meta_template_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id, nome)
);

create trigger trg_whatsapp_templates_updated_at
  before update on whatsapp_templates
  for each row execute function set_updated_at();

create table whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references whatsapp_conversas(id) on delete cascade,
  direcao direcao_mensagem not null,
  tipo tipo_mensagem_whatsapp not null default 'texto',
  conteudo text,
  url_midia text,
  template_id uuid references whatsapp_templates(id),
  status_entrega status_entrega_mensagem not null default 'enviado',
  whatsapp_message_id text,
  enviado_por uuid references usuarios(id),
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);

create index idx_whatsapp_mensagens_conversa on whatsapp_mensagens(conversa_id, criado_em desc);

create table whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  direcao direcao_mensagem not null,
  evento text not null,
  payload jsonb not null default '{}'::jsonb,
  sucesso boolean not null default true,
  erro text,
  criado_em timestamptz not null default now()
);

create index idx_whatsapp_logs_data on whatsapp_logs(criado_em desc);

-- ============================================================================
-- 3. RLS — todas as tabelas novas, escopadas por loja (mesmo padrão da Fase 3)
-- ============================================================================

alter table crm_etapas enable row level security;
alter table crm_tags enable row level security;
alter table crm_cards enable row level security;
alter table crm_card_tags enable row level security;
alter table crm_followups enable row level security;
alter table whatsapp_conversas enable row level security;
alter table whatsapp_templates enable row level security;
alter table whatsapp_mensagens enable row level security;
alter table whatsapp_logs enable row level security;

create policy "crm_etapas_staff_select" on crm_etapas for select
  using (loja_id = current_user_loja_id());
create policy "crm_etapas_admin_gerente_write" on crm_etapas for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "crm_tags_staff_all" on crm_tags for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor')
    and loja_id = current_user_loja_id()
  );

create policy "crm_cards_staff_all" on crm_cards for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor')
    and loja_id = current_user_loja_id()
  );

create policy "crm_card_tags_staff_all" on crm_card_tags for all
  using (
    exists (select 1 from crm_cards c where c.id = crm_card_tags.card_id and c.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

create policy "crm_followups_staff_all" on crm_followups for all
  using (
    exists (select 1 from crm_cards c where c.id = crm_followups.card_id and c.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

create policy "whatsapp_conversas_staff_all" on whatsapp_conversas for all
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor')
    and loja_id = current_user_loja_id()
  );

create policy "whatsapp_templates_staff_select" on whatsapp_templates for select
  using (loja_id = current_user_loja_id());
create policy "whatsapp_templates_admin_gerente_write" on whatsapp_templates for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "whatsapp_mensagens_staff_all" on whatsapp_mensagens for all
  using (
    exists (select 1 from whatsapp_conversas wc where wc.id = whatsapp_mensagens.conversa_id and wc.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

create policy "whatsapp_logs_admin_select" on whatsapp_logs for select
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- Cliente do Portal também pode ler as próprias conversas/mensagens
-- (mesma função current_portal_cliente_id() da Fase 8).
create policy "whatsapp_conversas_portal_select" on whatsapp_conversas for select
  using (cliente_id = current_portal_cliente_id());
create policy "whatsapp_mensagens_portal_select" on whatsapp_mensagens for select
  using (
    exists (select 1 from whatsapp_conversas wc where wc.id = whatsapp_mensagens.conversa_id and wc.cliente_id = current_portal_cliente_id())
  );

-- Inserção de mensagem/conversa via webhook roda com a Service Role Key
-- (bypassa RLS por natureza) — não precisa de policy de INSERT para "anon"
-- aqui. Ver services/whatsapp/whatsapp.service.ts.

-- ============================================================================
-- 4. RBAC — novo módulo "comunicacao" no menu de permissões
-- ============================================================================
insert into modulos (chave, nome) values ('comunicacao', 'Central de Comunicação')
on conflict (chave) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'admin', id, true, true, true, true from modulos where chave = 'comunicacao'
on conflict (cargo, modulo_id) do nothing;
insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'gerente', id, true, true, true, true from modulos where chave = 'comunicacao'
on conflict (cargo, modulo_id) do nothing;
insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'vendedor', id, true, true, true, false from modulos where chave = 'comunicacao'
on conflict (cargo, modulo_id) do nothing;

-- ============================================================================
-- 5. SEED — as 13 etapas do funil padrão pedidas na missão
-- ============================================================================
insert into crm_etapas (nome, ordem, cor) values
  ('Lead', 1, '#8A90A0'),
  ('Primeiro contato', 2, '#4CA9D9'),
  ('Em atendimento', 3, '#2643D6'),
  ('Orçamento enviado', 4, '#D97706'),
  ('Negociação', 5, '#E4572E'),
  ('Venda', 6, '#16A34A'),
  ('OS criada', 7, '#2643D6'),
  ('Em reparo', 8, '#D97706'),
  ('Pronto', 9, '#16A34A'),
  ('Entregue', 10, '#6B7280'),
  ('Pós-venda', 11, '#4CA9D9'),
  ('Cliente recorrente', 12, '#16A34A'),
  ('Cliente VIP', 13, '#D97706')
on conflict (loja_id, ordem) do nothing;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 9
-- ============================================================================
