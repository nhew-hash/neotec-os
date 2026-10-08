import { z } from "zod";
import { ORIGENS, urlMidiaValida, validarLinkAfiliado } from "./link";
import { slugValido } from "./slug";
import { CLASSES_MIDIA, STATUS_PRODUTO, type Ator } from "./tipos";

/**
 * Validação de produto — usada IGUAL pelo painel e pela API do Claude, pra
 * as regras nunca divergirem. Regras de honestidade do briefing viram código
 * aqui: preço anterior só existe se for MAIOR que o atual, e o desconto
 * informado precisa bater com os preços — nada de desconto falso.
 */

const urlMidia = z.string().trim().max(2000).refine(urlMidiaValida, "precisa ser uma URL https válida");
const preco = z.number().finite().min(0).max(9_999_999.99);

/** Id do Mercado Livre (ex.: MLB123456). */
export const idMl = z.string().trim().toUpperCase().regex(/^ML[A-Z]\d{1,15}$/, "id do Mercado Livre inválido (ex.: MLB123456)");
/** Objeto JSON livre, com tamanho limitado (notas e motivos da peneira). */
export const jsonPequeno = z
  .record(z.unknown())
  .refine((v) => JSON.stringify(v).length <= 5000, "máximo de 5000 caracteres em JSON");

const informacao = z.object({
  rotulo: z.string().trim().min(1).max(60),
  valor: z.string().trim().min(1).max(300),
}).strict();

const base = z.object({
  nome: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().refine(slugValido, "slug inválido (use letras minúsculas, números e hífens)").optional(),
  descricao: z.string().trim().max(5000).nullish(),
  categoria: z.string().trim().max(60).nullish(),
  imagem_principal: urlMidia.nullish(),
  imagens: z.array(urlMidia).max(12).optional(),
  video_url: urlMidia.nullish(),
  preco_atual: preco.nullish(),
  preco_anterior: preco.nullish(),
  desconto_percentual: z.number().finite().min(0).max(99.99).nullish(),
  link_afiliado: z.string().trim().min(1).max(2000),
  origem: z.enum(ORIGENS as [string, ...string[]]).optional(),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(15)
    .transform((t) => [...new Set(t.map((x) => x.toLowerCase()))])
    .optional(),
  destaque: z.boolean().optional(),
  selo: z.string().trim().max(30).nullish(),
  score: z.number().finite().min(0).max(9999).optional(),
  ordem: z.number().int().min(-9999).max(9999).optional(),
  informacoes: z.array(informacao).max(30).optional(),
  observacoes: z.string().trim().max(2000).nullish(),
  seo_titulo: z.string().trim().max(70).nullish(),
  seo_descricao: z.string().trim().max(170).nullish(),
  imagem_og: urlMidia.nullish(),
  // Fase 264 — dados da fábrica (internos, não aparecem no site).
  ml_catalog_id: idMl.nullish(),
  ml_item_id: idMl.nullish(),
  midia_classe: z.enum(CLASSES_MIDIA).nullish(),
  score_detalhe: jsonPequeno.nullish(),
});

export function validarCoerencia(p: {
  preco_atual?: number | null;
  preco_anterior?: number | null;
  desconto_percentual?: number | null;
}): string | null {
  const { preco_atual: atual, preco_anterior: anterior, desconto_percentual: desconto } = p;
  if (anterior != null && atual == null) return "Preço anterior sem preço atual: informe também o preço atual";
  if (anterior != null && atual != null && anterior <= atual) {
    return "O preço anterior precisa ser maior que o preço atual (senão não existe desconto real)";
  }
  if (anterior != null && atual != null && desconto != null) {
    const calculado = (1 - atual / anterior) * 100;
    if (Math.abs(calculado - desconto) > 1.5) {
      return `O desconto informado (${desconto}%) não bate com os preços (${calculado.toFixed(1)}%)`;
    }
  }
  return null;
}

type DadosParciais = {
  preco_atual?: number | null;
  preco_anterior?: number | null;
  desconto_percentual?: number | null;
  link_afiliado?: string;
  origem?: string;
};

function refinarLink(dados: DadosParciais, ctx: z.RefinementCtx) {
  if (dados.link_afiliado !== undefined) {
    const r = validarLinkAfiliado(dados.link_afiliado, (dados.origem ?? "mercado_livre") as "mercado_livre");
    if (!r.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.erro, path: ["link_afiliado"] });
  }
}

function refinarCriacao(dados: DadosParciais, ctx: z.RefinementCtx) {
  const incoerencia = validarCoerencia(dados);
  if (incoerencia) ctx.addIssue({ code: z.ZodIssueCode.custom, message: incoerencia, path: ["preco_anterior"] });
  refinarLink(dados, ctx);
}

/**
 * Criação. `status` só é aceito de uma pessoa logada no painel — o Claude
 * sempre cria RASCUNHO e ativa por uma operação própria (que exige outro
 * escopo), pra nada ir pro ar sem a escolha explícita de ativar.
 */
export function schemaCriarProduto(ator: Pick<Ator, "tipo">) {
  const comStatus = ator.tipo === "usuario" ? base.extend({ status: z.enum(STATUS_PRODUTO).optional() }) : base;
  return comStatus.strict().superRefine(refinarCriacao);
}

/**
 * Atualização parcial. Slug não muda depois de criado (quebraria links já
 * compartilhados). A coerência de preços NÃO é checada aqui: um patch só
 * com `preco_anterior` precisa ser avaliado junto do `preco_atual` que já
 * está no banco — quem faz isso é `executarFerramenta`, sobre o produto
 * mesclado.
 */
export const schemaAtualizarProduto = base
  .omit({ slug: true })
  .partial()
  .strict()
  .superRefine(refinarLink);

/** Tradução das mensagens do zod — o painel mostra o primeiro erro direto pra pessoa. */
export const mapaErrosPt: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return { message: issue.received === "undefined" ? "obrigatório" : `tipo inválido (esperado ${issue.expected})` };
    case z.ZodIssueCode.too_small:
      return { message: issue.type === "string" ? `mínimo de ${issue.minimum} caracteres` : issue.type === "array" ? `mínimo de ${issue.minimum} itens` : `valor mínimo ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      return { message: issue.type === "string" ? `máximo de ${issue.maximum} caracteres` : issue.type === "array" ? `máximo de ${issue.maximum} itens` : `valor máximo ${issue.maximum}` };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `campo(s) não aceito(s): ${issue.keys.join(", ")}` };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `valor inválido (aceitos: ${issue.options.join(", ")})` };
    default:
      return { message: ctx.defaultError };
  }
};

export function formatarErroZod(erro: z.ZodError): string {
  return erro.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
}
