import { z } from "zod";

export const ordemServicoSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente"),
  aparelho_id: z.string().optional().or(z.literal("")),
  defeito: z.string().trim().min(3, "Descreva o defeito relatado"),
  garantia_dias: z.coerce.number().int().min(0).optional(),
  prazo: z.string().optional().or(z.literal("")),
  urgente: z.boolean().default(false),
});
export type OrdemServicoFormValues = z.infer<typeof ordemServicoSchema>;

export const diagnosticoSchema = z.object({
  diagnostico: z.string().trim().min(3, "Descreva o diagnóstico"),
  valor: z.coerce.number().min(0).optional(),
});
export type DiagnosticoFormValues = z.infer<typeof diagnosticoSchema>;

export const pecaOsSchema = z.object({
  produto_id: z.string().uuid("Selecione a peça"),
  quantidade: z.coerce.number().int().positive().default(1),
});
export type PecaOsFormValues = z.infer<typeof pecaOsSchema>;

const camposChecklist = {
  liga: z.boolean().default(false),
  molhado: z.boolean().default(false),
  arranhado: z.boolean().default(false),
  tela: z.boolean().default(false),
  face_id: z.boolean().default(false),
  touch: z.boolean().default(false),
  botoes: z.boolean().default(false),
  cameras: z.boolean().default(false),
  biometria: z.boolean().default(false),
  senha_informada: z.boolean().default(false),
  observacoes: z.string().trim().optional().or(z.literal("")),
};

export const checklistOsSchema = z.object(camposChecklist);
export type ChecklistOsFormValues = z.infer<typeof checklistOsSchema>;
