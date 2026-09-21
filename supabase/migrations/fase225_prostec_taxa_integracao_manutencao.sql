-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 225 (Supabase / PostgreSQL)
-- Produtos de cobrança mensal (robô de automação, CRM) passam a ter
-- DOIS valores em vez de um só: uma taxa de integração (cobrança única
-- de implantação, cobrada no início) e uma mensalidade de manutenção
-- (cobrada todo mês a partir do 2º mês). Antes o campo "preco" era o
-- valor mensal inteiro, sem separar o custo de implantação — pedido
-- explícito do operador depois de revisar a tela de Configurações.
-- ============================================================================

alter table prostec_produtos add column if not exists valor_manutencao_mensal numeric(12,2) not null default 0;

-- Mesma separação na proposta que o cliente recebe — nullable porque a
-- maioria dos produtos não tem mensalidade nenhuma.
alter table prostec_propostas add column if not exists valor_manutencao_mensal numeric(12,2);

-- Ajusta os dois produtos mensais que já existiam com valor único pra
-- refletir a taxa de integração + manutenção mensal. Só mexe se ainda
-- estiver no valor padrão original (297/197 sem manutenção separada) —
-- se o operador já tiver customizado esses produtos na tela de
-- Configurações depois da fase 223, não sobrescreve o que ele ajustou.
update prostec_produtos
set preco = 697, valor_manutencao_mensal = 197,
    formas_pagamento = 'Taxa de integração via PIX ou cartão; manutenção mensal em assinatura recorrente (PIX ou cartão)'
where id = 'robo_chat' and preco = 297 and valor_manutencao_mensal = 0;

update prostec_produtos
set preco = 497, valor_manutencao_mensal = 97,
    formas_pagamento = 'Taxa de integração via PIX ou cartão; manutenção mensal em assinatura recorrente (PIX ou cartão)'
where id = 'crm' and preco = 197 and valor_manutencao_mensal = 0;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 225
-- ============================================================================
