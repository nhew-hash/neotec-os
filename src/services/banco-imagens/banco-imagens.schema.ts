import { z } from "zod";

// Content-types aceitos pro banco de imagens externo (Fase 247) — sempre
// imagem já otimizada, nunca PDF/vídeo/etc.
const CONTENT_TYPES_ACEITOS = ["image/webp", "image/png", "image/jpeg"] as const;
const TIPOS_FOTO = ["principal", "adicional", "cenario"] as const;
const CLASSIFICACOES = ["catalogo", "foto_real_terceiros", "foto_real_neotec"] as const;

export const fotoLoteSchema = z.object({
  arquivo: z.string().min(1, "Nome do arquivo é obrigatório"),
  tipo: z.enum(TIPOS_FOTO),
  ordem: z.coerce.number().int().min(0),
  content_type: z.enum(CONTENT_TYPES_ACEITOS, { errorMap: () => ({ message: "content_type precisa ser image/webp, image/png ou image/jpeg" }) }),
  bytes: z.coerce.number().int().positive().max(5 * 1024 * 1024, "Cada foto pode ter no máximo 5 MB"),
});
export type FotoLoteValues = z.infer<typeof fotoLoteSchema>;

export const grupoLoteSchema = z.object({
  origem_id: z.string().min(1, "origem_id é obrigatório"),
  categoria: z.string().min(1, "categoria é obrigatória"),
  marca: z.string().min(1, "marca é obrigatória"),
  modelo: z.string().min(1, "modelo é obrigatório"),
  cor: z.string().nullable().optional().default(null),
  cores_equivalentes: z.array(z.string()).optional().default([]),
  modelos_equivalentes: z.array(z.string()).optional().default([]),
  classificacao: z.enum(CLASSIFICACOES).optional().default("catalogo"),
  fonte_url: z.string().url().nullable().optional().default(null),
  observacao: z.string().nullable().optional().default(null),
  fotos: z.array(fotoLoteSchema).min(1, "Cada grupo precisa de pelo menos 1 foto").max(8, "Cada grupo pode ter no máximo 8 fotos"),
});
export type GrupoLoteValues = z.infer<typeof grupoLoteSchema>;

export const prepararLoteSchema = z.object({
  versao: z.literal(1),
  grupos: z.array(grupoLoteSchema).min(1, "Informe pelo menos 1 grupo").max(50, "No máximo 50 grupos por chamada"),
});
export type PrepararLoteValues = z.infer<typeof prepararLoteSchema>;

export const confirmarLoteSchema = z.object({
  grupos: z
    .array(
      z.object({
        origem_id: z.string().min(1),
        fotos: z
          .array(
            z.object({
              caminho_storage: z.string().min(1),
              tipo: z.enum(TIPOS_FOTO),
              ordem: z.coerce.number().int().min(0),
            })
          )
          .min(1, "Cada grupo precisa de pelo menos 1 foto"),
      })
    )
    .min(1, "Informe pelo menos 1 grupo"),
});
export type ConfirmarLoteValues = z.infer<typeof confirmarLoteSchema>;

export const revincularLoteSchema = z.object({
  origem_ids: z.array(z.string().min(1)).min(1, "Informe pelo menos 1 origem_id"),
  forcar: z.boolean().optional().default(false),
});
export type RevincularLoteValues = z.infer<typeof revincularLoteSchema>;
