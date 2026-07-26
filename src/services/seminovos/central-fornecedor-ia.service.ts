import { z } from "zod";
import { executarPromptIA } from "@/services/ia/ia.service";

export type DestinoItemFornecedor = "seminovo" | "lacrado" | "generico";

const itemSchema = z.object({
  destino: z.enum(["seminovo", "lacrado", "generico"]),
  modelo: z.string(),
  categoria: z.enum(["iphone", "android", "apple_watch", "ipad", "mac", "acessorio"]).default("iphone"),
  marca: z.string().nullable().default(null),
  memoria: z.string().nullable().default(null),
  cor: z.string().nullable().default(null),
  bateria: z.coerce.number().nullable().default(null),
  observacoes: z.string().nullable().default(null),
  preco: z.coerce.number(),
  linhaOriginal: z.string(),
});

export type ItemFornecedorExtraido = z.infer<typeof itemSchema>;

const PROMPT_SISTEMA = `Você é a Central de Cadastro por Fornecedor da Neotec — recebe listas de preço bagunçadas (WhatsApp de fornecedor, com emoji, abreviação, tudo misturado) e classifica CADA item pro destino certo.

REGRA DE CLASSIFICAÇÃO (a mais importante):
- "seminovo": tem SAÚDE DE BATERIA (%) no texto. Ex: "17 256G 100%💜4499" → seminovo, bateria 100.
- "lacrado": aparelho novo/lacrado, geralmente sob um cabeçalho "LACRADOS" — NUNCA tem % de bateria. Ex: "17 pro max 512g⚪️8599" → lacrado.
- "generico": qualquer coisa que não é iPhone/Android (iPad, MacBook, Apple Watch, acessório, JBL, qualquer outra marca/produto). Nunca tenta forçar isso em seminovo ou lacrado.

REGRA DE ITENS MÚLTIPLOS NA MESMA LINHA:
Quando uma linha de seminovo tiver VÁRIOS pares de bateria+cor antes do preço
(ex: "16 PRO MAX 256G 90%⚫️90%🩶92%💛5149"), isso significa VÁRIAS UNIDADES
diferentes desse mesmo modelo/memória, cada uma com sua bateria/cor — todas
ao mesmo preço mostrado no final da linha. Devolva um item separado pra
cada par bateria+cor, repetindo o mesmo preço.

REGRA DE EMOJI DE COR (comum em fornecedor):
⚫️/🖤 = Preto, ⚪️ = Branco, 🔵 = Azul, 🟣/💜 = Roxo, 🟡/💛 = Amarelo,
🟢/💚 = Verde, 🩶 = Titânio/Cinza, 🧡 = Laranja.

Responda APENAS com um objeto JSON no formato {"itens": [...]}, assim:
{"itens": [{"destino": "seminovo", "modelo": "iPhone 17", "categoria": "iphone", "marca": null, "memoria": "256GB", "cor": "Roxo", "bateria": 100, "observacoes": null, "preco": 4499, "linhaOriginal": "17 256G 100%💜4499"}]}

Regras gerais:
- "modelo" sempre completo: "iPhone 17 Pro Max", "iPad", "MacBook Air", "Apple Watch Series 11", "JBL Go 4" — o que fizer sentido.
- "categoria": iphone/android/apple_watch/ipad/mac/acessorio — pra JBL (não é Apple), usa "acessorio" e põe "JBL" em "marca".
- "observacoes": guarda detalhe extra relevante — "com caixa", "detalhes de uso", "tampa traseira trocada", tamanho de tela (40mm/42mm/46mm), specs (256/8), etc.
- "linhaOriginal": copia a linha (ou trecho) de origem, ajuda a equipe conferir depois.
- Nunca invente preço — se não tiver preço claro na linha, pule o item.
- Ignore linhas de cabeçalho/decoração (títulos de seção, "🔥🔥🔥", etc.) — elas não são item, só ajudam a entender o contexto das linhas seguintes.`;

function normalizarResposta(bruto: unknown): unknown[] {
  if (Array.isArray(bruto)) return bruto;
  if (bruto && typeof bruto === "object" && Array.isArray((bruto as { itens?: unknown }).itens)) {
    return (bruto as { itens: unknown[] }).itens;
  }
  throw new Error("A IA devolveu um formato que não reconheço — tenta de novo ou reformula o texto.");
}

/** Nunca aplica nada sozinho — só classifica e extrai, pra revisão humana antes de qualquer cadastro/atualização real. */
export async function classificarItensFornecedor(texto: string): Promise<ItemFornecedorExtraido[]> {
  const resultado = await executarPromptIA({
    modulo: "central_fornecedor_ia",
    prompt: texto,
    sistema: PROMPT_SISTEMA,
    temperatura: 0.1,
    formatoJson: true,
    maxTokens: 4000, // listas de fornecedor podem ser longas — evita cortar resposta no meio
  });

  let bruto: unknown;
  try {
    bruto = JSON.parse(resultado.texto);
  } catch {
    throw new Error("Não consegui interpretar o texto — a IA não devolveu um JSON válido. Tenta colar em partes menores.");
  }

  const itensBrutos = normalizarResposta(bruto);
  const parsed = z.array(itemSchema).safeParse(itensBrutos);
  if (!parsed.success) throw new Error("A IA devolveu dados em formato inesperado — confere o texto colado e tenta de novo.");

  return parsed.data;
}
