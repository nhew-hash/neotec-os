import { z } from "zod";

export const lancamentoSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  categoria: z.string().trim().min(2, "Informe a categoria"),
  valor: z.coerce.number().positive("Informe um valor válido"),
  descricao: z.string().trim().optional().or(z.literal("")),
});
export type LancamentoFormValues = z.infer<typeof lancamentoSchema>;
