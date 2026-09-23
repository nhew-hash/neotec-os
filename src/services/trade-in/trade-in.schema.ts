import { z } from "zod";

export const checklistRespostaSchema = z.record(z.string(), z.enum(["ok", "reprovado"]));

export const criarAvaliacaoSchema = z.object({
  origem: z.enum(["site", "neotec_os", "bot"]),
  modeloId: z.string().uuid("Selecione um modelo"),
  avariasMarcadas: z.array(z.string()).default([]),
  bateriaSaude: z.coerce.number().min(0).max(100).nullable().optional(),
  checklistRespostas: checklistRespostaSchema.optional(),
  clienteId: z.string().uuid().nullable().optional(),
  clienteNome: z.string().trim().max(200).nullable().optional(),
  clienteTelefone: z.string().trim().max(30).nullable().optional(),
  imei: z.string().trim().max(30).nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});
export type CriarAvaliacaoValues = z.infer<typeof criarAvaliacaoSchema>;

export const aprovarAvaliacaoSchema = z.object({
  id: z.string().uuid(),
  valorAprovado: z.coerce.number().min(0).optional(),
  motivoAlteracao: z.string().trim().max(1000).optional(),
});

export const salvarModeloSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2, "Informe o nome do modelo"),
  familia: z.string().trim().min(2, "Informe a família (ex: iPhone 13)"),
  marca: z.string().trim().optional().or(z.literal("")),
  ordem: z.coerce.number().int().default(0),
  valorTroca: z.coerce.number().min(0, "Informe o valor de troca"),
  ativo: z.boolean().default(true),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  avarias: z.array(z.object({ avariaCodigo: z.string(), desconto: z.coerce.number().min(0) })).default([]),
});
export type SalvarModeloValues = z.infer<typeof salvarModeloSchema>;

export const salvarConfigTradeInSchema = z.object({
  bateriaCorte: z.coerce.number().int().min(0).max(100),
  bonusSeminovo: z.coerce.number().min(0),
  regrasTexto: z.string().trim().max(5000),
});
