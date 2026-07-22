import { z } from "zod";

export const configuracaoIASchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "local"]),
  modelo: z.string().trim().min(1, "Informe o modelo"),
  ativo: z.boolean().default(false),
  atendimento_automatico_ativo: z.boolean().default(false),
  temperatura: z.coerce.number().min(0).max(2).default(0.2),
  limite_tokens: z.coerce.number().int().min(100).max(32000).default(4000),
  prompt_sistema: z.string().trim().optional().or(z.literal("")),
  numero_vendedor_perguntas: z.string().trim().optional().or(z.literal("")),
});
export type ConfiguracaoIAFormValues = z.infer<typeof configuracaoIASchema>;
