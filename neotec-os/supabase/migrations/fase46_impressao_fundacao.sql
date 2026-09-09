-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 46 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: fundação do módulo de impressão profissional —
-- templates reutilizáveis (não presos ao React), cadastro de
-- impressoras (estrutura pronta, uso real só na Fase 3 com QZ Tray),
-- histórico de impressão, checklist da OS estendido pro layout
-- completo pedido.
-- ============================================================================

create type tipo_documento_impressao as enum (
  'os', 'orcamento', 'venda', 'recibo', 'etiqueta', 'garantia', 'termo_entrega', 'termo_entrada'
);
create type formato_impressao as enum ('a4', 'cupom', 'etiqueta');
create type tipo_impressora as enum ('a4', 'cupom', 'etiqueta');

-- Templates com placeholders ({{cliente}}, {{qr_code}}, etc.) — HTML
-- guardado no banco, não no React. Permite editar layout, criar modelo
-- novo, sem precisar de deploy.
create table documento_templates (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  tipo_documento tipo_documento_impressao not null,
  formato formato_impressao not null,
  nome text not null,
  conteudo_html text not null,
  padrao boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documento_templates_tipo on documento_templates(loja_id, tipo_documento, formato);

-- Só um template "padrão" por tipo+formato+loja — regra de negócio real
-- (não faz sentido dois templates padrão pro mesmo documento), e é o
-- alvo que o ON CONFLICT da semente de templates (Fase 47) precisa pra
-- não duplicar se a migração rodar mais de uma vez.
create unique index idx_documento_templates_padrao_unico
  on documento_templates(loja_id, tipo_documento, formato)
  where padrao = true;

create trigger trg_documento_templates_updated_at
  before update on documento_templates
  for each row execute function set_updated_at();

-- Cadastro de impressoras — estrutura pronta desde já, mas SEM
-- impressão direta funcionando ainda (isso só na Fase 3, com QZ Tray
-- rodando localmente em cada computador — mesma natureza do Bridge do
-- WhatsApp, não é algo que o servidor sozinho alcança).
create table impressoras (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  tipo tipo_impressora not null,
  driver text,
  padrao boolean not null default false,
  status text not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_impressoras_updated_at
  before update on impressoras
  for each row execute function set_updated_at();

-- Preferência de impressora por usuário e por tipo de documento.
-- usuario_id nulo = padrão da loja inteira (vale pra quem não tem
-- preferência própria configurada).
create table impressora_documento_preferencia (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  usuario_id uuid references usuarios(id),
  tipo_documento tipo_documento_impressao not null,
  impressora_id uuid not null references impressoras(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Duas constraints em vez de uma "unique (loja_id, usuario_id, tipo_documento)"
-- simples: no Postgres, NULL nunca é considerado igual a NULL numa
-- unique constraint comum, então duas preferências "da loja inteira"
-- (usuario_id null) pro mesmo documento não seriam bloqueadas por uma
-- unique normal. A segunda (índice parcial) cobre exatamente esse caso.
create unique index idx_impressora_pref_usuario_unico
  on impressora_documento_preferencia(loja_id, usuario_id, tipo_documento)
  where usuario_id is not null;
create unique index idx_impressora_pref_loja_unico
  on impressora_documento_preferencia(loja_id, tipo_documento)
  where usuario_id is null;

-- Histórico de toda impressão — quem, quando, o quê, quantas vezes.
create table historico_impressoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  usuario_id uuid references usuarios(id),
  tipo_documento tipo_documento_impressao not null,
  referencia_id uuid not null,
  impressora_id uuid references impressoras(id),
  quantidade integer not null default 1,
  criado_em timestamptz not null default now()
);

create index idx_historico_impressoes_referencia on historico_impressoes(tipo_documento, referencia_id);
create index idx_historico_impressoes_data on historico_impressoes(criado_em desc);

-- Checklist da OS estendido — campos que já existiam (liga, molhado,
-- arranhado, tela, face_id, touch, botoes, cameras, biometria) mais os
-- que faltavam pro layout completo pedido.
alter table checklist_os
  add column if not exists microfone boolean,
  add column if not exists alto_falante boolean,
  add column if not exists auricular boolean,
  add column if not exists flash boolean,
  add column if not exists wifi boolean,
  add column if not exists bluetooth boolean,
  add column if not exists carregamento boolean,
  add column if not exists sensor boolean,
  add column if not exists vibracao boolean;

-- Assinatura digital — arquitetura preparada, desativada por padrão.
alter table configuracoes_ia
  add column if not exists assinatura_digital_habilitada boolean not null default false;
comment on column configuracoes_ia.assinatura_digital_habilitada is
  'Preparado pra Fase 4 do módulo de impressão — assinatura digital em tablet/mouse/celular. Desativado até essa fase existir de verdade.';

alter table documento_templates enable row level security;
alter table impressoras enable row level security;
alter table impressora_documento_preferencia enable row level security;
alter table historico_impressoes enable row level security;

create policy "documento_templates_staff_select" on documento_templates for select
  using (loja_id = current_user_loja_id());
create policy "documento_templates_admin_gerente_write" on documento_templates for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "impressoras_staff_select" on impressoras for select
  using (loja_id = current_user_loja_id());
create policy "impressoras_admin_gerente_write" on impressoras for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "impressora_documento_preferencia_staff_all" on impressora_documento_preferencia for all
  using (loja_id = current_user_loja_id());

create policy "historico_impressoes_staff_select" on historico_impressoes for select
  using (loja_id = current_user_loja_id());

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 46
-- ============================================================================
