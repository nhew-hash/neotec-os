-- Fase 228
--
-- A Fase 227 tinha criado um campo manual de "acréscimo fixo no
-- cartão" em configuracoes_gateway_pagamento. Só que o Neotec OS já
-- tem, desde a Fase 96, um motor de precificação próprio
-- (Financeiro → Parcelamento: configuracoes_precificacao +
-- tabela_taxas_parcelamento) que já calcula o preço do cartão
-- ("preço vitrine") a partir do preço registrado (Pix) usando a taxa
-- real configurada — é o mesmo cálculo que já aparece na ficha do
-- produto ("ou R$X no cartão"). O checkout da loja online passa a
-- usar esse motor em vez de um valor manual duplicado, então o campo
-- da Fase 227 fica obsoleto.
--
-- "if exists" porque não tem garantia de que a Fase 227 chegou a ser
-- aplicada no banco antes dessa correção.

alter table configuracoes_gateway_pagamento
  drop column if exists acrescimo_cartao_fixo;
