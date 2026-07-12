import { z } from "zod";

export const consignacaoSchema = z.object({
  cliente_id: z.string().uuid("Selecione o proprietário"),
  aparelho_id: z.string().uuid("Selecione o aparelho"),
  valor_combinado: z.coerce.number().positive("Informe o valor combinado"),
  prazo: z.string().optional().or(z.literal("")),
});
export type ConsignacaoFormValues = z.infer<typeof consignacaoSchema>;
