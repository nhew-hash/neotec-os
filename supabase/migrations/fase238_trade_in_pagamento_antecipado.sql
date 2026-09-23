-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 238 (Supabase / PostgreSQL)
-- Trade-in "pagamento antecipado": o cliente já compra o iPhone no site
-- fazendo DOIS pagamentos reais (produto com o desconto já aplicado +
-- valor da estimativa do aparelho antigo). O estorno do 2º pagamento é
-- MANUAL (o dono faz direto no Mercado Pago depois de avaliar o
-- aparelho recebido) — aqui só guardamos os dois pedidos ligados à
-- avaliação, pra ficar claro o que precisa ser estornado e quando isso
-- já foi feito.
-- ============================================================================

alter table avaliacoes_trade_in
  add column if not exists pagamento_antecipado_pedido_produto_id uuid references pedidos_loja(id) on delete set null;
alter table avaliacoes_trade_in
  add column if not exists pagamento_antecipado_pedido_estorno_id uuid references pedidos_loja(id) on delete set null;
alter table avaliacoes_trade_in
  add column if not exists pagamento_antecipado_estornado boolean not null default false;
alter table avaliacoes_trade_in
  add column if not exists pagamento_antecipado_estornado_em timestamptz;

create index if not exists idx_avaliacoes_trade_in_pedido_estorno on avaliacoes_trade_in (pagamento_antecipado_pedido_estorno_id) where pagamento_antecipado_pedido_estorno_id is not null;

notify pgrst, 'reload schema';
