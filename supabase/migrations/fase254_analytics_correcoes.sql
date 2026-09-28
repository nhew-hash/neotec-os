-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 254 (Supabase / PostgreSQL)
-- Correções decorrentes da auditoria completa de /loja-admin/analytics:
--   C3 — coluna `canal` em `vendas`, pra separar loja física de site
--        (hoje misturados sem discriminador nenhum).
--   C6 — aperta o select de `loja_sessoes`/`loja_eventos` (tráfego do
--        site) pra admin/gerente, igual já é feito em toda tabela
--        financeira — hoje qualquer usuário autenticado (ex: técnico,
--        vendedor) conseguia ler via API mesmo sem o link aparecer no
--        menu (nav-items só esconde o link, não protege a tabela).
-- (C7 — redução do fan-out de ~20 queries foi resolvida só no código,
--  buscando cada tabela uma vez e agrupando em memória — não precisou
--  de função nova no banco, então não está nesta migração.)
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'vendas' and column_name = 'canal'
  ) then
    alter table vendas add column canal text;
  end if;
end $$;

comment on column vendas.canal is 'Origem da venda: loja_fisica (PDV/orçamento aprovado) ou site (checkout online). Nulo = vendas antigas, anteriores a esta coluna (não é possível reconstruir retroativamente sem inventar dado).';

-- Backfill best-effort das vendas já existentes: só é possível inferir
-- com confiança as vendas que vieram de pedido online, porque essas
-- são rastreáveis via `pedidos_loja` (mesmo sem FK direta pra `vendas`,
-- dá pra casar por proximidade de valor+timestamp+forma de pagamento
-- não seria confiável o suficiente) — então, honestamente, NÃO faz
-- backfill nenhum aqui. Vendas antigas ficam com canal = null e o
-- relatório trata null como "não classificado", nunca como um dos dois
-- canais (evita inventar dado histórico que a auditoria proibiu).

-- --------------------------------------------------------------------------
-- C6 — aperta RLS de leitura das tabelas de tráfego do site.
-- --------------------------------------------------------------------------
drop policy if exists "loja_sessoes_select_staff" on loja_sessoes;
create policy "loja_sessoes_select_staff" on loja_sessoes
  for select to authenticated
  using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "loja_eventos_select_staff" on loja_eventos;
create policy "loja_eventos_select_staff" on loja_eventos
  for select to authenticated
  using (current_user_cargo() in ('admin', 'gerente'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 254
-- ============================================================================
