-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 6 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Estoque de Aparelhos — origem de entrada, fornecedor,
-- preço mínimo/sugerido, e colunas de vínculo com Investidor/Consignação
-- (sem FK ainda — as tabelas de destino só existem a partir da Fase 7;
-- os FKs são adicionados lá, via ALTER TABLE, sem quebrar nada aqui).
-- ============================================================================

-- CREATE TYPE não tem "IF NOT EXISTS" nativo no Postgres — este bloco
-- substitui isso, para o script poder ser rodado mais de uma vez sem erro
-- (ex: se uma execução anterior parou no meio por qualquer motivo).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'origem_entrada_aparelho') then
    create type origem_entrada_aparelho as enum (
      'fornecedor', 'cliente', 'troca', 'compra', 'consignacao',
      'investidor', 'marketplace', 'leilao'
    );
  end if;
end $$;

alter table aparelhos
  add column if not exists fornecedor text,
  add column if not exists origem_entrada origem_entrada_aparelho not null default 'fornecedor',
  add column if not exists preco_minimo numeric(12,2),
  add column if not exists preco_sugerido numeric(12,2),
  add column if not exists investidor_id uuid,
  add column if not exists consignacao_id uuid;

create index if not exists idx_aparelhos_origem_entrada on aparelhos(origem_entrada);
create index if not exists idx_aparelhos_investidor on aparelhos(investidor_id);
create index if not exists idx_aparelhos_consignacao on aparelhos(consignacao_id);

-- vw_aparelhos_seguro (Fase 1) precisa ser recriada para incluir os campos
-- novos — mantém a mesma regra de mascaramento de custo já decidida.
drop view if exists vw_aparelhos_seguro;
create view vw_aparelhos_seguro as
select
  id, produto_id, imei, numero_serie, cor, memoria, bateria, condicao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  case when current_user_cargo() = 'admin' then preco_minimo else null end as preco_minimo,
  preco_sugerido,
  fornecedor, origem_entrada, investidor_id, consignacao_id,
  status, cliente_origem_id, data_entrada, updated_at
from aparelhos;

grant select on vw_aparelhos_seguro to authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 6
-- ============================================================================
