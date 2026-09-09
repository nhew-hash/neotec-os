import { z } from "zod";

export const retornoSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente"),
  data_retorno: z.string().min(1, "Informe a data do retorno"),
  motivo: z.string().trim().min(2, "Descreva o motivo do retorno"),
  observacao: z.string().trim().optional().or(z.literal("")),
});

export type RetornoFormValues = z.infer<typeof retornoSchema>;
