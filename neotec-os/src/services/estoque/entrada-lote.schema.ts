import { z } from "zod";

export const itemEntradaLoteSchema = z.object({
  produto_id: z.string().uuid("Selecione o produto"),
  nome: z.string(), // só exibição no carrinho, não é gravado
  quantidade: z.coerce.number().int().positive("Informe uma quantidade válida"),
  custo_unitario: z.coerce.number().min(0).optional(),
});
export type ItemEntradaLoteValues = z.infer<typeof itemEntradaLoteSchema>;

export const entradaLoteSchema = z.object({
  fornecedor: z.string().trim().optional().or(z.literal("")),
  itens: z.array(itemEntradaLoteSchema).min(1, "Adicione pelo menos um item"),
});
export type EntradaLoteValues = z.infer<typeof entradaLoteSchema>;
