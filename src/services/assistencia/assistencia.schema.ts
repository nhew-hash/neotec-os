import { z } from "zod";

/** Campos do checklist — compartilhados entre a criação da OS (recebimento,
 * embutido no mesmo formulário) e o checklist de entrega (tela separada). */
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
  senha_valor: z.string().trim().optional().or(z.literal("")),
  senha_tipo: z.enum(["numerica", "desenho"]).optional(),
  observacoes: z.string().trim().optional().or(z.literal("")),
};

export const checklistOsSchema = z.object(camposChecklist);
export type ChecklistOsFormValues = z.infer<typeof checklistOsSchema>;

export const ordemServicoSchema = z
  .object({
    cliente_id: z.string().optional().or(z.literal("")),
    cliente_novo_nome: z.string().trim().optional().or(z.literal("")),
    cliente_novo_whatsapp: z.string().trim().optional().or(z.literal("")),
    aparelho_id: z.string().optional().or(z.literal("")),
    aparelho_descricao: z.string().trim().optional().or(z.literal("")),
    defeito: z.string().trim().min(3, "Descreva o defeito relatado"),
    diagnostico_inicial: z.string().trim().optional().or(z.literal("")),
    garantia_dias: z.coerce.number().int().min(0).optional(),
    prazo: z.string().optional().or(z.literal("")),
    urgente: z.boolean().default(false),
    indicador_id: z.string().optional().or(z.literal("")),
    // Checklist de recebimento, preenchido na mesma tela — decisão do
    // dono do produto: capturar tudo (inclusive a senha) no momento em
    // que o aparelho chega, não numa etapa separada depois.
    ...camposChecklist,
  })
  .refine((data) => Boolean(data.cliente_id) || Boolean(data.cliente_novo_nome && data.cliente_novo_whatsapp), {
    message: "Selecione um cliente existente ou preencha nome e WhatsApp do cliente novo",
    path: ["cliente_id"],
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
