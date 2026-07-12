import { z } from "zod";

export const crmCardSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente"),
  etapa_id: z.string().uuid("Selecione a etapa"),
  titulo: z.string().trim().min(2, "Descreva a oportunidade"),
  valor_estimado: z.coerce.number().min(0).optional(),
  responsavel_id: z.string().optional().or(z.literal("")),
});
export type CrmCardFormValues = z.infer<typeof crmCardSchema>;

export const crmEtapaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da etapa"),
  cor: z.string().trim().min(4, "Informe uma cor válida"),
});
export type CrmEtapaFormValues = z.infer<typeof crmEtapaSchema>;

export const crmFollowupSchema = z.object({
  card_id: z.string().uuid(),
  data_agendada: z.string().min(1, "Informe a data"),
  motivo: z.string().trim().min(2, "Descreva o motivo"),
});
export type CrmFollowupFormValues = z.infer<typeof crmFollowupSchema>;

export const crmTagSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da tag"),
  cor: z.string().trim().min(4).default("#6B7280"),
});
export type CrmTagFormValues = z.infer<typeof crmTagSchema>;
