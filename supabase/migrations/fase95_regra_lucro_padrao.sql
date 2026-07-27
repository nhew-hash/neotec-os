-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 95 (Supabase / PostgreSQL)
-- Corrige um gap real: instalação nova nunca tinha regra de lucro
-- nenhuma cadastrada (Fase 80 só criou a tabela, não semeou nada) —
-- resultado prático: todo item processado pela Central de Cadastro
-- saía com preço de venda = preço pago, lucro zero, sem avisar
-- ninguém. Semeia uma regra padrão de 15%, editável a qualquer
-- momento em Estoque → Central de Cadastro → Regras de lucro. Só
-- insere se a loja realmente não tiver nenhuma regra ainda — não
-- sobrescreve nada que já foi configurado.
-- ============================================================================

insert into regras_lucro (loja_id, nome, tipo, percentual, ativa, padrao)
select l.id, 'Padrão (15%)', 'percentual', 15, true, true
from lojas l
where not exists (select 1 from regras_lucro r where r.loja_id = l.id);

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 95
-- ============================================================================
