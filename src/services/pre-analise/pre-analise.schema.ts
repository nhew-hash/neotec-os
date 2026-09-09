import { z } from "zod";

export const preAnaliseSchema = z.object({
  aparelhoDesejado: z.string().trim().min(1, "Escolhe o aparelho"),
  entrada: z.coerce.number().min(0, "Valor inválido"),
  parcelaDesejada: z.coerce.number().min(0, "Valor inválido"),

  temAparelhoTroca: z.boolean(),
  aparelhoTrocaModelo: z.string().trim().optional(),
  aparelhoTrocaEstado: z.enum(["excelente", "bom", "regular", "com_defeito"]).optional(),
  aparelhoTrocaDefeito: z.string().trim().optional(),

  trabalha: z.boolean(),
  tipoTrabalho: z.enum(["clt", "autonomo", "empresario", "servidor_publico", "freelancer", "outro"]).optional(),
  tempoTrabalho: z.enum(["menos_3_meses", "3_a_6_meses", "6_meses_a_1_ano", "1_a_2_anos", "mais_2_anos"]).optional(),
  tempoRegistroClt: z.enum(["menos_3_meses", "3_a_6_meses", "6_meses_a_1_ano", "1_a_2_anos", "mais_2_anos"]).optional(),
  rendaMensal: z.coerce.number().min(0, "Valor inválido"),

  estadoCivil: z.enum(["solteiro", "casado", "uniao_estavel", "divorciado", "viuvo"]),
  dependentes: z.enum(["nenhum", "1", "2", "3_ou_mais"]),

  moradia: z.enum(["propria", "alugada", "com_familiares", "financiada", "outro"]),
  tempoMoradia: z.enum(["menos_6_meses", "6_meses_a_1_ano", "1_a_2_anos", "mais_2_anos"]),

  nome: z.string().trim().min(3, "Informa o nome completo"),
  // Aceita com/sem máscara — normaliza pra só dígitos na action, valida quantidade de dígitos aqui.
  whatsapp: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 10, "WhatsApp inválido"),

  termoAceito: z.boolean().refine((v) => v === true, "Precisa aceitar o termo pra continuar"),
});

export type PreAnaliseFormValues = z.infer<typeof preAnaliseSchema>;
