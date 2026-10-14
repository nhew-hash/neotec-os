-- ============================================================================
-- FASE 266 — Bot como assistente comercial (Fase C da auditoria)
-- NÃO APLICADA EM NENHUM BANCO. ADITIVA. Depende da fase264 (nao_contatar).
--
-- Modo padrão = 'assistente': o sistema SUGERE, a vendedora edita/aprova/envia.
-- O modo 'automatico' só existe para quem o dono ligar explicitamente por loja.
-- ============================================================================

create table if not exists configuracoes_bot (
  loja_id           uuid primary key default default_loja_id() references lojas(id),
  modo              text not null default 'assistente' check (modo in ('assistente', 'automatico')),
  hora_inicio       smallint not null default 9  check (hora_inicio between 0 and 23),
  hora_fim          smallint not null default 19 check (hora_fim between 1 and 24),
  permite_domingo   boolean not null default false,
  atualizado_por    uuid references auth.users(id),
  updated_at        timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

create table if not exists sugestoes_comerciais (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null default default_loja_id() references lojas(id),
  conversa_id       uuid not null references whatsapp_conversas(id) on delete cascade,
  card_id           uuid references crm_cards(id) on delete set null,
  cliente_id        uuid references clientes(id) on delete set null,
  responsavel_id    uuid references usuarios(id) on delete set null,
  tipo              text not null check (tipo in (
    'cliente_aguardando', 'pediu_preco', 'cliente_parou', 'objecao_preco', 'objecao_parcelamento',
    'objecao_concorrencia', 'objecao_confianca', 'objecao_troca', 'retomar_depois', 'perto_de_fechar',
    'precisa_gerente', 'sem_responsavel'
  )),
  motivo            text not null,                 -- por que a sugestão existe (visível à vendedora)
  mensagem_sugerida text,
  mensagem_final    text,                          -- o que de fato foi enviado (pode ter sido editado)
  prioridade        smallint not null default 2 check (prioridade between 1 and 3), -- 1 = urgente
  horario_recomendado timestamptz not null,        -- dentro da janela comercial
  status            text not null default 'sugerida' check (status in ('sugerida', 'enviada', 'adiada', 'descartada', 'vencida')),
  adiada_ate        timestamptz,
  chave_dedupe      text not null,                 -- conversa + tipo + última mensagem: mesma situação não gera duas
  resultado         text check (resultado in ('respondeu', 'sem_resposta', 'fechou', 'perdido')),
  resultado_em      timestamptz,
  resultado_obs     text,
  decidido_por      uuid references auth.users(id),
  decidido_em       timestamptz,
  motivo_descarte   text,
  enviada_em        timestamptz,
  criado_em         timestamptz not null default now(),
  unique (chave_dedupe)
);
create index if not exists idx_sugestoes_status on sugestoes_comerciais (loja_id, status, prioridade, horario_recomendado);
create index if not exists idx_sugestoes_conversa on sugestoes_comerciais (conversa_id, criado_em desc);
create index if not exists idx_sugestoes_responsavel on sugestoes_comerciais (responsavel_id, status);

alter table configuracoes_bot enable row level security;
alter table sugestoes_comerciais enable row level security;

drop policy if exists "configuracoes_bot_leitura" on configuracoes_bot;
create policy "configuracoes_bot_leitura" on configuracoes_bot for select
  using (loja_id = current_user_loja_id());
drop policy if exists "configuracoes_bot_admin" on configuracoes_bot;
create policy "configuracoes_bot_admin" on configuracoes_bot for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id())
  with check (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- Equipe comercial vê e trabalha as sugestões da própria loja. A criação é feita pelo cron (service role).
drop policy if exists "sugestoes_comerciais_equipe_select" on sugestoes_comerciais;
create policy "sugestoes_comerciais_equipe_select" on sugestoes_comerciais for select
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente', 'vendedor'));
drop policy if exists "sugestoes_comerciais_equipe_update" on sugestoes_comerciais;
create policy "sugestoes_comerciais_equipe_update" on sugestoes_comerciais for update
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente', 'vendedor'))
  with check (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente', 'vendedor'));

notify pgrst, 'reload schema';

-- ROLLBACK: drop table if exists sugestoes_comerciais, configuracoes_bot cascade;
