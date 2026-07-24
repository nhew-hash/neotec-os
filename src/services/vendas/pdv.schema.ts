import { z } from "zod";

export const pdvItemSchema = z.object({
  tipo: z.enum(["aparelho", "produto"]),
  id: z.string().uuid(),
  nome: z.string(), // só pra exibição no carrinho, não é gravado
  quantidade: z.coerce.number().int().positive().default(1),
  valor: z.coerce.number().min(0, "Informe um valor válido"),
});
export type PdvItemValues = z.infer<typeof pdvItemSchema>;

export const pdvVendaSchema = z.object({
  cliente_id: z.string().uuid().optional(),
  forma_pagamento: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "boleto", "misto"]),
  desconto: z.coerce.number().min(0).default(0),
  garantia_dias: z.coerce.number().int().min(0).optional(),
  indicador_id: z.string().uuid().optional(),
  cashback_utilizado: z.coerce.number().min(0).default(0),
  cashback_concedido: z.coerce.number().min(0).default(0),
  itens: z.array(pdvItemSchema).min(1, "Adicione pelo menos um item à venda"),
});
export type PdvVendaValues = z.infer<typeof pdvVendaSchema>;
