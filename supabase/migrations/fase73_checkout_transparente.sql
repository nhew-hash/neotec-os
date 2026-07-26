-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 73 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: fundação do Checkout Transparente — tabela
-- `pagamentos` (histórico detalhado, um registro por tentativa/
-- transação, não só o status final do pedido) e configuração do
-- gateway (Configurações → Pagamentos → Mercado Pago).
--
-- Arquitetura pensada pra múltiplos gateways no futuro (Stripe, Asaas,
-- PagSeguro) — `gateway` é uma coluna, não um enum fechado só de
-- Mercado Pago, e `configuracoes_gateway_pagamento` já é uma tabela
-- por gateway, não uma linha fixa só de Mercado Pago.
-- ============================================================================

create type status_pagamento as enum (
  'pendente', 'aprovado', 'recusado', 'cancelado', 'estornado', 'chargeback', 'expirado'
);

create type tipo_pagamento_gateway as enum ('pix', 'cartao_credito', 'cartao_debito', 'boleto');

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  pedido_id uuid not null references pedidos_loja(id),
  gateway text not null default 'mercadopago',
  payment_id text, -- id da transação no gateway (preenchido quando o gateway responde)
  status status_pagamento not null default 'pendente',
  tipo_pagamento tipo_pagamento_gateway,
  parcelas integer,
  valor numeric(12,2) not null,
  valor_liquido numeric(12,2), -- valor - taxa do gateway, preenchido quando o gateway informa
  taxa_gateway numeric(12,2),
  pix_qrcode text, -- imagem base64 do QR Code (Pix)
  pix_copia_cola text,
  pix_expira_em timestamptz,
  metadata jsonb not null default '{}'::jsonb, -- payload cru relevante do gateway, pra depuração sem precisar de nova coluna a cada campo novo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pagamentos_pedido on pagamentos(pedido_id);
create index idx_pagamentos_payment_id on pagamentos(payment_id);

create trigger trg_pagamentos_updated_at
  before update on pagamentos
  for each row execute function set_updated_at();

alter table pagamentos enable row level security;

create policy "pagamentos_staff_select" on pagamentos for select
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor', 'caixa') and loja_id = current_user_loja_id());

-- Configuração do gateway — uma linha por gateway (hoje só Mercado
-- Pago, estrutura já aberta pra Stripe/Asaas/PagSeguro no futuro sem
-- precisar de migration nova, só um insert a mais).
create table configuracoes_gateway_pagamento (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  gateway text not null default 'mercadopago',
  public_key text,
  access_token text, -- nunca exposto pro cliente — só lido em código de servidor
  webhook_secret text,
  modo text not null default 'sandbox', -- 'sandbox' | 'producao'
  ativo boolean not null default false,
  ultimo_teste_conexao_em timestamptz,
  ultimo_teste_conexao_sucesso boolean,
  ultimo_webhook_recebido_em timestamptz,
  ultimo_pagamento_aprovado_em timestamptz,
  updated_at timestamptz not null default now(),
  unique (loja_id, gateway)
);

create trigger trg_configuracoes_gateway_pagamento_updated_at
  before update on configuracoes_gateway_pagamento
  for each row execute function set_updated_at();

insert into configuracoes_gateway_pagamento (loja_id, gateway) select id, 'mercadopago' from lojas;

alter table configuracoes_gateway_pagamento enable row level security;

create policy "configuracoes_gateway_pagamento_admin_write" on configuracoes_gateway_pagamento for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

alter publication supabase_realtime add table pagamentos;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 73
-- ============================================================================
