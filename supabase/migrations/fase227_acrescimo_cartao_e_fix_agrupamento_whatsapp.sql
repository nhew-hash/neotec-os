-- Fase 227
--
-- 1) Acréscimo fixo no pagamento com cartão (checkout da loja online):
--    o operador pode configurar um valor fixo em R$ que é somado ao
--    total só quando o cliente escolhe "Cartão" (Pix continua sem
--    acréscimo). Fica junto da configuração do Mercado Pago porque é
--    o mesmo lugar que já guarda o resto da config de pagamento.
--
-- 2) O fix de agrupamento de conversas/status-como-mensagem (Bridge +
--    Neotec OS) é só código, não mexe em banco — por isso não tem
--    mais nada nesta migration além do item 1.

alter table configuracoes_gateway_pagamento
  add column if not exists acrescimo_cartao_fixo numeric(10, 2) not null default 0;

comment on column configuracoes_gateway_pagamento.acrescimo_cartao_fixo is
  'Valor fixo em R$ somado ao total do pedido quando o cliente paga com cartão no checkout da loja online. 0 = sem acréscimo. Não se aplica ao Pix.';
