import { z } from "zod";

export const cashbackSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo: z.enum(["credito", "debito"]),
  valor: z.coerce.number().positive("Informe um valor válido"),
  origem: z.string().trim().optional().or(z.literal("")),
});
export type CashbackFormValues = z.infer<typeof cashbackSchema>;
