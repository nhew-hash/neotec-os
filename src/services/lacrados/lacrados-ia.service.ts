import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { executarPromptIA } from "@/services/ia/ia.service";
import { listarLacradosComVariantes } from "./lacrados.service";

export interface ItemTabelaFornecedor {
  linhaOriginal: string;
  modeloDetectado: string;
  armazenamento: string;
  cor: string;
  preco: number;
  varianteId: string | null; // null = não achou correspondência no catálogo mestre
  modeloEncontrado: string | null;
}

/**
 * Formato pedido pra IA. IMPORTANTE: `formatoJson: true` liga o modo
 * JSON forçado da OpenAI (`response_format: json_object`), que EXIGE
 * um objeto na raiz — um array puro `[...]` não é aceito por esse modo,
 * o próprio provider da OpenAI rejeitaria. Por isso o formato pedido
 * aqui é `{"itens": [...]}`, nunca array solto.
 */
const itemBrutoSchema = z.object({
  modelo: z.string(),
  armazenamento: z.string(),
  cor: z.string(),
  preco: z.coerce.number(),
});

const respostaIaSchema = z.object({
  itens: z.array(itemBrutoSchema),
});

type ItemBruto = z.infer<typeof itemBrutoSchema>;

const PROMPT_SISTEMA = `Você extrai uma lista de produtos de um texto solto de fornecedor de iPhone (lacrados). Cada linha geralmente tem: modelo, armazenamento, cor, preço — mas a ordem e o formato variam.

Exemplo de entrada:
17 Pro Max 256GB Preto - R$ 7.099
17 Pro Max 256GB Branco - R$ 7.149
iPhone 13 128gb azul r$ 2800

Responda APENAS com um objeto JSON no formato abaixo — nunca um array solto na raiz, sempre dentro da chave "itens":
{"itens": [{"modelo": "iPhone 17 Pro Max", "armazenamento": "256GB", "cor": "Preto", "preco": 7099}]}

Regras:
- "modelo" sempre no formato completo "iPhone X" (ex: "17 Pro Max" vira "iPhone 17 Pro Max", "13" vira "iPhone 13").
- "armazenamento" sempre em GB ou TB, maiúsculo, sem espaço (ex: "256GB", "1TB").
- "preco" é sempre número, sem "R$", sem separador de milhar (ex: 7099, não "7.099").
- Ignore linha que não conseguir identificar modelo+armazenamento+preço com confiança.
- Se nenhuma linha for reconhecida, responda {"itens": []} — nunca omita a chave "itens".`;

/**
 * Aceita tanto `{"itens": [...]}` (o formato pedido, e o único válido
 * pro modo JSON forçado da OpenAI) quanto um array solto `[...]` (caso
 * o texto bruto da IA venha assim mesmo, por qualquer motivo — provider
 * diferente, mudança de comportamento do modelo, etc.). NUNCA chama
 * `.map()` sem confirmar Array.isArray() antes — é exatamente essa
 * falta de checagem que causava "b.map is not a function" quando a IA
 * devolvia objeto em vez de array.
 */
function normalizarRespostaIA(textoJson: string): ItemBruto[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(textoJson);
  } catch {
    throw new Error("Não consegui interpretar o texto — a IA não devolveu um JSON válido. Tenta de novo.");
  }

  // Caso 1: array solto na raiz.
  if (Array.isArray(bruto)) {
    const parsed = z.array(itemBrutoSchema).safeParse(bruto);
    if (!parsed.success) throw new Error("A IA devolveu itens em formato inesperado — tenta reformular o texto colado.");
    return parsed.data;
  }

  // Caso 2: objeto com chave "itens" (formato padrão, exigido pelo modo JSON da OpenAI).
  if (bruto && typeof bruto === "object") {
    const parsed = respostaIaSchema.safeParse(bruto);
    if (parsed.success) return parsed.data.itens;
  }

  throw new Error("A IA devolveu um formato que não reconheço (nem array, nem {itens: [...]}) — tenta de novo ou reformula o texto.");
}

/**
 * Não aplica nada ainda — só interpreta e casa com o catálogo mestre,
 * devolvendo uma lista pra revisão humana antes de qualquer preço/
 * quantidade real mudar. Atualização em lote sem confirmação seria
 * arriscado demais (a IA pode errar o casamento de modelo/cor).
 */
export async function interpretarTabelaFornecedor(texto: string): Promise<ItemTabelaFornecedor[]> {
  const resultado = await executarPromptIA({
    modulo: "lacrados_fornecedor",
    prompt: texto,
    sistema: PROMPT_SISTEMA,
    temperatura: 0.1, // extração estruturada — quer o mínimo de "criatividade" possível
    formatoJson: true,
  });

  const itensBrutos = normalizarRespostaIA(resultado.texto);
  const catalogo = await listarLacradosComVariantes();

  return itensBrutos.map((item) => {
    const modelo = catalogo.find((m) => normalizarTexto(m.nome) === normalizarTexto(item.modelo));
    const variante = modelo?.variantes.find(
      (v) => normalizarTexto(v.armazenamento) === normalizarTexto(item.armazenamento) && normalizarTexto(v.cor).includes(normalizarTexto(item.cor))
    );

    return {
      linhaOriginal: `${item.modelo} ${item.armazenamento} ${item.cor} — R$ ${item.preco}`,
      modeloDetectado: item.modelo,
      armazenamento: item.armazenamento,
      cor: item.cor,
      preco: item.preco,
      varianteId: variante?.id ?? null,
      modeloEncontrado: modelo?.nome ?? null,
    };
  });
}

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Aplica só os itens que o usuário confirmou (tiveram correspondência e foram revisados). Marca quantidade 1 — presença na lista do fornecedor = "disponível agora". */
export async function aplicarAtualizacaoLacrados(itens: { varianteId: string; preco: number }[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    itens.map((item) =>
      supabase.from("catalogo_lacrados_variantes").update({ preco_venda: item.preco, quantidade: 1 }).eq("id", item.varianteId)
    )
  );
}
