import { z } from "zod";

export const cotacaoItemSchema = z.object({
  tipo_produto: z.string().default("celular"),
  modelo: z.string().trim().min(1, "Informe o modelo"),
  armazenamento: z.string().trim().optional().or(z.literal("")),
  cor: z.string().trim().optional().or(z.literal("")),
  bateria_percentual: z.coerce.number().int().min(0).max(100).optional(),
  preco: z.coerce.number().min(0, "Informe um preço válido"),
  quantidade: z.coerce.number().int().positive().default(1),
  garantia: z.string().trim().optional().or(z.literal("")),
  observacao: z.string().trim().optional().or(z.literal("")),
});
export type CotacaoItemFormValues = z.infer<typeof cotacaoItemSchema>;

export const novaCotacaoSchema = z.object({
  fornecedor: z.string().trim().min(1, "Informe o fornecedor"),
  categoria: z.string().trim().min(1, "Informe a categoria"),
  data_cotacao: z.string().min(1, "Informe a data"),
  observacao: z.string().trim().optional().or(z.literal("")),
  texto_original: z.string().trim().min(5, "Cole o texto da cotação"),
  itens: z.array(cotacaoItemSchema).min(1, "A cotação precisa de pelo menos um item"),
});
export type NovaCotacaoValues = z.infer<typeof novaCotacaoSchema>;

export const CATEGORIAS_SUGERIDAS = [
  "iPhone Seminovo", "iPhone Lacrado", "iPhone Loja",
  "Android Seminovo", "Android Lacrado", "Android Loja",
];
