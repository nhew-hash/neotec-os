import { z } from "zod";

export const portalCadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  whatsapp: z.string().trim().regex(/^\d{10,11}$/, "Informe o WhatsApp com DDD, somente números"),
  cpf: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
});
export type PortalCadastroFormValues = z.infer<typeof portalCadastroSchema>;
