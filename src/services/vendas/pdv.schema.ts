import { z } from "zod";

export const pdvItemSchema = z.object({
  tipo: z.enum(["aparelho", "produto"]),
  id: z.string().uuid(),
  nome: z.string(), // só pra exibição no carrinho, não é gravado
  quantidade: z.coerce.number().int().positive().default(1),
  valor: z.coerce.number().min(0, "Informe um valor válido"),
  ehBrinde: z.boolean().optional().default(false),
});
export type PdvItemValues = z.infer<typeof pdvItemSchema>;

export const pdvPagamentoSchema = z.object({
  metodo: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "boleto"]),
  valor: z.coerce.number().positive("Valor precisa ser maior que zero"),
});
export type PdvPagamentoValues = z.infer<typeof pdvPagamentoSchema>;

export const pdvVendaSchema = z.object({
  cliente_id: z.string().uuid().optional(),
  forma_pagamento: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "boleto", "misto"]),
  pagamentos: z.array(pdvPagamentoSchema).optional(),
  desconto: z.coerce.number().min(0).default(0),
  garantia_dias: z.coerce.number().int().min(0).optional(),
  indicador_id: z.string().uuid().optional(),
  cashback_utilizado: z.coerce.number().min(0).default(0),
  cashback_concedido: z.coerce.number().min(0).default(0),
  // Abatimento por trade-in — o valor usado no cálculo NUNCA vem daqui:
  // o servidor busca o valor aprovado da avaliação e ignora qualquer
  // número mandado pelo client (mesmo padrão do cashback_utilizado).
  trade_in_avaliacao_id: z.string().uuid().optional(),
  itens: z.array(pdvItemSchema).min(1, "Adicione pelo menos um item à venda"),
}).refine(
  (dados) => dados.forma_pagamento !== "misto" || (dados.pagamentos && dados.pagamentos.length >= 2),
  { message: "Pagamento misto precisa de pelo menos 2 formas diferentes", path: ["pagamentos"] }
);
export type PdvVendaValues = z.infer<typeof pdvVendaSchema>;
