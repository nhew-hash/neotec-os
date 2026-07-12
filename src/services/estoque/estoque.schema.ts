import { z } from "zod";

export const produtoSchema = z.object({
  categoria: z.enum(["iphone", "android", "apple_watch", "ipad", "acessorio", "peca"]),
  marca: z.string().trim().optional().or(z.literal("")),
  modelo: z.string().trim().optional().or(z.literal("")),
  nome: z.string().trim().min(2, "Informe o nome do produto"),
  descricao: z.string().trim().optional().or(z.literal("")),
  preco_venda: z.coerce.number().min(0, "Informe um valor válido").optional(),
  custo: z.coerce.number().min(0, "Informe um valor válido").optional(),
});
export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export const aparelhoSchema = z.object({
  produto_id: z.string().uuid("Selecione o modelo do catálogo"),
  imei: z.string().trim().min(5, "Informe o IMEI"),
  numero_serie: z.string().trim().optional().or(z.literal("")),
  cor: z.string().trim().optional().or(z.literal("")),
  memoria: z.string().trim().optional().or(z.literal("")),
  bateria: z.coerce.number().min(0).max(100).optional(),
  condicao: z.enum(["novo", "seminovo", "usado"]),
  custo: z.coerce.number().min(0, "Informe o custo"),
  preco_venda: z.coerce.number().min(0, "Informe o preço de venda").optional(),
  preco_minimo: z.coerce.number().min(0).optional(),
  preco_sugerido: z.coerce.number().min(0).optional(),
  fornecedor: z.string().trim().optional().or(z.literal("")),
  origem_entrada: z.enum([
    "fornecedor", "cliente", "troca", "compra", "consignacao", "investidor", "marketplace", "leilao",
  ]),
  investidor_id: z.string().optional().or(z.literal("")),
});
export type AparelhoFormValues = z.infer<typeof aparelhoSchema>;

export const testeAparelhoSchema = z.object({
  face_id: z.boolean().default(false),
  camera: z.boolean().default(false),
  tela: z.boolean().default(false),
  som: z.boolean().default(false),
  microfone: z.boolean().default(false),
  wifi: z.boolean().default(false),
  bluetooth: z.boolean().default(false),
  carregamento: z.boolean().default(false),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type TesteAparelhoFormValues = z.infer<typeof testeAparelhoSchema>;
