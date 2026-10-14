-- Roteiro de validação da fase265 — rodar SOMENTE em banco de TESTE, dentro de uma
-- transação que é desfeita no fim (ROLLBACK). Nunca em produção.
-- Pré-requisitos: 1 loja, 1 usuário vendedor e 1 gerente (auth.users + usuarios),
-- 1 aparelho 'disponivel', 1 produto com saldo 1, 1 cliente. Troque os UUIDs abaixo.
-- Para simular o usuário:  select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
--                          set local role authenticated;
begin;

-- T-01 ATOMICIDADE: forçar falha no último passo e conferir que NADA foi gravado.
--   (a) crie um aparelho disponível A; (b) chame registrar_venda_pdv com garantia_dias e cliente_id inexistente
--       para estourar a FK de garantias; (c) esperado: exceção E aparelho A ainda 'disponivel',
--       nenhuma linha nova em vendas/venda_itens/movimentos_estoque/financeiro.
--   select registrar_venda_pdv('{"forma_pagamento":"pix","desconto":0,"cashback_utilizado":0,"cashback_concedido":0,
--     "garantia_dias":90,"cliente_id":"00000000-0000-0000-0000-000000000000",
--     "itens":[{"tipo":"aparelho","id":"<A>","quantidade":1,"valor":1000}]}'::jsonb);

-- T-02 VENDA DUPLA: em DUAS sessões simultâneas, chamar a mesma venda do aparelho A.
--   Esperado: uma retorna o id da venda, a outra falha com APARELHO_INDISPONIVEL.

-- T-02b SALDO: produto com saldo 1, duas sessões pedindo quantidade 1 ao mesmo tempo.
--   Esperado: uma passa, a outra falha com SALDO_INSUFICIENTE. Quantidade 2 numa sessão só: SALDO_INSUFICIENTE.

-- T-03 DESCONTO: insert into configuracoes_desconto(regra_ativa) values (true);
--       insert into regras_desconto(cargo, percentual_max) values ('vendedor', 5);  -- valor de TESTE, não é regra da loja
--   Como vendedor: desconto de 3% passa; 10% falha com DESCONTO_REQUER_APROVACAO;
--   desconto > bruto falha com DESCONTO_INVALIDO; como admin: 10% passa sem aprovação.
--   Fluxo de aprovação: vendedor insere em aprovacoes_desconto (status 'pendente'); gerente atualiza para 'aprovada';
--   vendedor repete a venda com aprovacao_desconto_id -> passa e a aprovação vira 'usada';
--   repetir com a mesma aprovação -> APROVACAO_INVALIDA. Conferir linha 'desconto_aplicado' em auditoria_operacoes.

-- T-04 CASHBACK/TRADE-IN: cashback_utilizado maior que o saldo -> CASHBACK_INSUFICIENTE;
--   trade-in com status diferente de 'aprovado' -> TRADE_IN_NAO_APROVADO; reutilizar trade-in já convertido -> idem.

-- T-05 PAGAMENTO MISTO: soma diferente do total -> PAGAMENTO_DIVERGENTE.

rollback;
