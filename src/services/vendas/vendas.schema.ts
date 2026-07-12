import { z } from "zod";

export const orcamentoSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente"),
  produto_id: z.string().optional().or(z.literal("")),
  aparelho_id: z.string().optional().or(z.literal("")),
  valor: z.coerce.number().positive("Informe um valor válido"),
  forma_pagamento: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "boleto", "cashback", "misto"]).optional(),
  garantia_dias: z.coerce.number().int().min(0).optional(),
  validade: z.string().optional().or(z.literal("")),
}).refine((data) => data.produto_id || data.aparelho_id, {
  message: "Selecione um produto ou aparelho",
  path: ["produto_id"],
});

export type OrcamentoFormValues = z.infer<typeof orcamentoSchema>;
