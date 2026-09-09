import { z } from "zod";

export const impressoraSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da impressora"),
  tipo: z.enum(["a4", "cupom", "etiqueta"]),
  driver: z.string().trim().optional().or(z.literal("")),
  padrao: z.boolean().default(false),
});
export type ImpressoraFormValues = z.infer<typeof impressoraSchema>;
