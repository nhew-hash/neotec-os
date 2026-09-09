import { z } from "zod";

export const indicadorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  telefone: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type IndicadorFormValues = z.infer<typeof indicadorSchema>;

export const movimentoIndicadorSchema = z.object({
  indicador_id: z.string().uuid(),
  tipo: z.enum(["credito", "retirada"]),
  valor: z.coerce.number().positive("Informe um valor válido"),
  motivo: z.string().trim().optional().or(z.literal("")),
});
export type MovimentoIndicadorFormValues = z.infer<typeof movimentoIndicadorSchema>;
