-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 210 (Supabase / PostgreSQL)
-- Frete grátis pra todo o Brasil — antes só Araguari/Uberlândia
-- entregavam (qualquer outra cidade era recusada no checkout).
-- Mantém configurável: cidade específica continua podendo ter regra
-- própria (preço/prazo diferente), a regra "nacional" só serve de
-- fallback pra quem não tiver regra específica.
-- ============================================================================

alter table regras_frete add column if not exists nacional boolean not null default false;

create unique index if not exists idx_regras_frete_nacional_unica on regras_frete(nacional) where nacional = true;

insert into regras_frete (loja_id, regiao, valor, prazo_dias_uteis, ordem, nacional)
select id, 'Frete Nacional (todo o Brasil)', 0, 7, 99, true from lojas
where not exists (select 1 from regras_frete where nacional = true);

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 210
-- ============================================================================
