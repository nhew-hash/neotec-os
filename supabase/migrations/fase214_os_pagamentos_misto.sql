-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 214 (Supabase / PostgreSQL)
-- Pagamento misto na Assistência Técnica — mesmo padrão já usado em
-- venda_pagamentos (Fase 212), agora pra ordem de serviço.
-- ============================================================================

create table if not exists os_pagamentos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references ordens_servico(id) on delete cascade,
  metodo text not null check (metodo in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto')),
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_os_pagamentos_os on os_pagamentos(os_id);

alter table os_pagamentos enable row level security;

drop policy if exists "os_pagamentos_staff" on os_pagamentos;
create policy "os_pagamentos_staff" on os_pagamentos for all using (current_user_cargo() in ('admin', 'gerente', 'tecnico'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 214
-- ============================================================================
