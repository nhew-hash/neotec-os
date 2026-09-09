-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 198 (Supabase / PostgreSQL)
-- Frete visível no checkout — a tabela regras_frete já existia e já
-- era gerenciada pelo admin, só nunca tinha sido exposta pro cliente
-- final escolher. Adiciona leitura pública (só linhas ativas — nunca
-- vazamento de configuração desativada) e os campos em pedidos_loja
-- pra guardar o que o cliente escolheu.
-- ============================================================================

create policy "regras_frete_public_select" on regras_frete for select
  to anon, authenticated
  using (ativo = true);

alter table pedidos_loja add column if not exists tipo_entrega text check (tipo_entrega in ('retirada', 'entrega'));
alter table pedidos_loja add column if not exists regiao_entrega text;
alter table pedidos_loja add column if not exists valor_frete numeric(12,2) not null default 0;

comment on column pedidos_loja.tipo_entrega is 'Escolha do cliente no checkout — retirada na loja (grátis) ou entrega numa região configurada.';
comment on column pedidos_loja.valor_frete is 'Valor do frete, somado ao total do pedido — 0 quando é retirada.';

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 198
-- ============================================================================
