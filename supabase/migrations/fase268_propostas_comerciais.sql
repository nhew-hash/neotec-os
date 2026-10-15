-- ============================================================================
-- FASE 268 — Propostas comerciais: modo de atendimento, vínculo com a conversa e histórico
-- NÃO APLICADA EM NENHUM BANCO. ADITIVA (só ADD COLUMN IF NOT EXISTS e uma tabela nova).
-- Sem dados semeados. O código funciona (com limitações avisadas na tela) antes desta migration.
-- ============================================================================

alter table orcamentos
  add column if not exists modo_atendimento text check (modo_atendimento in ('whatsapp', 'presencial')),
  add column if not exists conversa_id uuid references whatsapp_conversas(id) on delete set null,
  add column if not exists desconto numeric(12,2) not null default 0 check (desconto >= 0),
  add column if not exists trade_in_avaliacao_id uuid references avaliacoes_trade_in(id) on delete set null,
  add column if not exists observacoes text;

comment on column orcamentos.desconto is 'Desconto comercial concedido na proposta (já validado pela regra de desconto no servidor).';
comment on column orcamentos.trade_in_avaliacao_id is 'Avaliação de trade-in APROVADA usada como abatimento; repassada à venda na conversão.';
comment on column orcamentos.observacoes is 'Observação interna da equipe. Nunca aparece na apresentação ao cliente.';

-- Histórico append-only: quem fez o quê com a proposta (copiou, abriu o WhatsApp, enviou de verdade, cliente aceitou...).
create table if not exists proposta_eventos (
  id           uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  tipo         text not null check (tipo in ('criada', 'editada', 'copiada', 'whatsapp_aberto', 'enviada', 'aguardando_resposta', 'aceita', 'recusada', 'observacao')),
  modo         text check (modo in ('whatsapp', 'presencial')),
  usuario_id   uuid references usuarios(id),
  conversa_id  uuid references whatsapp_conversas(id) on delete set null,
  dados        jsonb not null default '{}'::jsonb,
  criado_em    timestamptz not null default now()
);
create index if not exists idx_proposta_eventos_orcamento on proposta_eventos (orcamento_id, criado_em desc);

alter table proposta_eventos enable row level security;

-- Leitura e inserção para a equipe comercial da mesma loja. SEM políticas de update/delete = histórico imutável.
drop policy if exists proposta_eventos_select on proposta_eventos;
create policy proposta_eventos_select on proposta_eventos for select
  using (
    current_user_cargo() in ('admin', 'gerente', 'vendedor')
    and exists (select 1 from orcamentos o join clientes cl on cl.id = o.cliente_id
                where o.id = proposta_eventos.orcamento_id and cl.loja_id = current_user_loja_id())
  );
drop policy if exists proposta_eventos_insert on proposta_eventos;
create policy proposta_eventos_insert on proposta_eventos for insert
  with check (
    current_user_cargo() in ('admin', 'gerente', 'vendedor')
    and usuario_id = auth.uid()
    and exists (select 1 from orcamentos o join clientes cl on cl.id = o.cliente_id
                where o.id = proposta_eventos.orcamento_id and cl.loja_id = current_user_loja_id())
  );

notify pgrst, 'reload schema';
-- ============================================================================
-- ORDEM: aplicar depois de 264, 265, 266 e 267, primeiro em ambiente de teste.
-- ============================================================================
