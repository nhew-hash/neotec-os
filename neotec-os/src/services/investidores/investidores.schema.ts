import { z } from "zod";

export const investidorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do investidor"),
  telefone: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type InvestidorFormValues = z.infer<typeof investidorSchema>;

export const movimentoInvestidorSchema = z.object({
  investidor_id: z.string().uuid(),
  tipo: z.enum(["aporte", "saque"]),
  valor: z.coerce.number().positive("Informe um valor válido"),
  observacao: z.string().trim().optional().or(z.literal("")),
});
export type MovimentoInvestidorFormValues = z.infer<typeof movimentoInvestidorSchema>;
