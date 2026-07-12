import { z } from "zod";

/**
 * Regra de validação de cliente compartilhada entre o formulário
 * (client-side, via React Hook Form) e a Server Action (server-side).
 * Nunca confiar apenas na validação do formulário.
 */
export const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo"),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Informe o WhatsApp com DDD, somente números"),
  cpf: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  apple_id: z.string().trim().optional().or(z.literal("")),
  endereco: z.string().trim().optional().or(z.literal("")),
  cidade: z.string().trim().optional().or(z.literal("")),
  estado: z.string().trim().max(2, "Use a sigla do estado (ex: MG)").optional().or(z.literal("")),
  origem: z
    .enum(["instagram", "google", "indicacao", "loja_fisica", "shopify", "outros"])
    .optional(),
  aceita_marketing: z.boolean().default(false),
  observacoes: z.string().trim().optional().or(z.literal("")),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;
