-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 212 (Supabase / PostgreSQL)
-- Detalhamento de pagamento misto — "Misto" já existia como opção na
-- lista de forma de pagamento, mas nunca teve como dizer QUANTO foi
-- em cada método. Essa tabela guarda a composição real (ex: R$500
-- dinheiro + R$300 Pix + R$200 cartão numa venda de R$1.000).
-- ============================================================================

create table if not exists venda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id) on delete cascade,
  metodo text not null check (metodo in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto')),
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_venda_pagamentos_venda on venda_pagamentos(venda_id);

alter table venda_pagamentos enable row level security;

drop policy if exists "venda_pagamentos_staff" on venda_pagamentos;
create policy "venda_pagamentos_staff" on venda_pagamentos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor', 'caixa'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 212
-- ============================================================================
