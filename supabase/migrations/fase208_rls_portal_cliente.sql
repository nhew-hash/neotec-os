-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 208 (Supabase / PostgreSQL)
-- RLS faltando: cliente logado no Portal precisa conseguir ver os
-- PRÓPRIOS pedidos. Sem isso, o dashboard do portal sempre retorna
-- vazio mesmo com tudo certo no código — RLS bloqueia silenciosamente.
-- ============================================================================

drop policy if exists "pedidos_loja_select_proprio_cliente" on pedidos_loja;
create policy "pedidos_loja_select_proprio_cliente" on pedidos_loja for select
  using (
    cliente_id in (select id from clientes where portal_user_id = auth.uid())
  );

drop policy if exists "pedido_loja_itens_select_proprio_cliente" on pedido_loja_itens;
create policy "pedido_loja_itens_select_proprio_cliente" on pedido_loja_itens for select
  using (
    pedido_id in (
      select id from pedidos_loja where cliente_id in (select id from clientes where portal_user_id = auth.uid())
    )
  );

-- Cliente também precisa conseguir ler o PRÓPRIO registro em
-- `clientes` (nome, whatsapp) — sem isso, buscarClientePortalLogado
-- também retornaria vazio pelo mesmo motivo.
drop policy if exists "clientes_select_proprio_portal" on clientes;
create policy "clientes_select_proprio_portal" on clientes for select
  using (portal_user_id = auth.uid());

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 208
-- ============================================================================
