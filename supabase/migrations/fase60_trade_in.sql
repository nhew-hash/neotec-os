-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 60 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Trade-in da loja pública — formulário que coleta
-- dados do aparelho do cliente e vira um lead pra equipe avaliar e
-- responder por WhatsApp. Sem tabela de valores automática (decisão
-- explícita — fica pra uma entrega futura, se quiser).
-- ============================================================================

create type status_trade_in as enum ('novo', 'em_avaliacao', 'respondido', 'concluido', 'descartado');

create table solicitacoes_trade_in (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome_contato text not null,
  telefone_contato text not null,
  modelo_aparelho text not null,
  armazenamento text,
  condicao_relatada text,
  observacoes text,
  status status_trade_in not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_solicitacoes_trade_in_updated_at
  before update on solicitacoes_trade_in
  for each row execute function set_updated_at();

alter table solicitacoes_trade_in enable row level security;

create policy "trade_in_insert_publico" on solicitacoes_trade_in for insert
  with check (true);

create policy "trade_in_staff_all" on solicitacoes_trade_in for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());

alter publication supabase_realtime add table solicitacoes_trade_in;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 60
-- ============================================================================
