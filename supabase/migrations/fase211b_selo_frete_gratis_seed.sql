-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 211b (Supabase / PostgreSQL)
-- Semeia o selo "Frete Grátis Brasil" — precisa rodar DEPOIS da
-- fase211a (que criou o valor do enum), nunca junto na mesma
-- transação.
-- ============================================================================

insert into selos_confianca (loja_id, tipo, label, ordem)
select id, 'frete_gratis'::tipo_selo_confianca, 'Frete Grátis Brasil', 6
from lojas
where not exists (select 1 from selos_confianca where tipo = 'frete_gratis'::tipo_selo_confianca);

notify pgrst, 'reload schema';
