import { z } from "zod";
import { executarPromptIA } from "@/services/ia/ia.service";

export interface DadosSeminovoExtraidos {
  modelo: string;
  memoria: string | null;
  cor: string | null;
  bateria: number | null;
  telaOriginal: boolean | null;
  faceIdOk: boolean | null;
  trueToneOk: boolean | null;
  pecasSubstituidas: ("tela" | "bateria" | "carcaca")[];
  observacoes: string | null;
  precoPago: number | null;
}

const dadoSchema = z.object({
  modelo: z.string(),
  memoria: z.string().nullable().default(null),
  cor: z.string().nullable().default(null),
  bateria: z.coerce.number().nullable().default(null),
  tela_original: z.boolean().nullable().default(null),
  face_id_ok: z.boolean().nullable().default(null),
  true_tone_ok: z.boolean().nullable().default(null),
  pecas_substituidas: z.array(z.enum(["tela", "bateria", "carcaca"])).default([]),
  observacoes: z.string().nullable().default(null),
  preco_pago: z.coerce.number().nullable().default(null),
});

const PROMPT_SISTEMA = `Você extrai dados de aparelhos seminovos (iPhone/Android) de texto solto colado por um lojista — pode ser um aparelho só ou uma lista.

Exemplo de entrada:
15 PRO MAX 256G
Preto
92%
Tela trocada
Face ok
Preço 3900

Responda APENAS com um objeto JSON: {"itens": [{"modelo": "iPhone 15 Pro Max", "memoria": "256GB", "cor": "Preto", "bateria": 92, "tela_original": false, "face_id_ok": true, "true_tone_ok": null, "pecas_substituidas": ["tela"], "observacoes": null, "preco_pago": 3900}]}

Regras:
- "modelo" sempre completo, formato "iPhone X" ou a marca correta pro Android.
- "bateria" é número de 0 a 100, sem o símbolo %.
- "tela_original": true se o texto disser "tela original"/"tela ok"; false se disser "tela trocada"/"tela não original"; null se não mencionar.
- "face_id_ok"/"true_tone_ok": true se mencionar que está ok/funcionando; false se mencionar problema; null se não mencionar.
- "pecas_substituidas": inclua "tela" se a tela foi trocada, "bateria" se a bateria foi trocada, "carcaca" se a carcaça foi trocada. Array vazio se nada foi mencionado como trocado.
- "preco_pago" é o valor pago pelo lojista (não o preço de venda) — número puro, sem "R$".
- Se o texto tiver mais de um aparelho, devolva um item por aparelho no array.
- Nunca invente informação que não está no texto — campo não mencionado fica null (ou array vazio pra pecas_substituidas).`;

/** Nunca aplica nada sozinho — devolve os dados extraídos pra revisão humana antes de qualquer cadastro real acontecer. */
export async function extrairDadosSeminovo(texto: string): Promise<DadosSeminovoExtraidos[]> {
  const resultado = await executarPromptIA({
    modulo: "seminovo_cadastro_ia",
    prompt: texto,
    sistema: PROMPT_SISTEMA,
    temperatura: 0.1,
    formatoJson: true,
  });

  let bruto: unknown;
  try {
    bruto = JSON.parse(resultado.texto);
  } catch {
    throw new Error("Não consegui interpretar o texto — a IA não devolveu um JSON válido. Tenta de novo.");
  }

  // Mesma defesa aprendida no bug do fornecedor: aceita {itens: [...]}
  // (o formato pedido, único válido pro modo JSON forçado da OpenAI)
  // e, por segurança, um array solto também — nunca confia sem checar.
  let itensBrutos: unknown;
  if (Array.isArray(bruto)) {
    itensBrutos = bruto;
  } else if (bruto && typeof bruto === "object" && Array.isArray((bruto as { itens?: unknown }).itens)) {
    itensBrutos = (bruto as { itens: unknown }).itens;
  } else {
    throw new Error("A IA devolveu um formato que não reconheço — tenta de novo ou reformula o texto.");
  }

  const parsed = z.array(dadoSchema).safeParse(itensBrutos);
  if (!parsed.success) throw new Error("A IA devolveu dados em formato inesperado — confere o texto colado e tenta de novo.");

  return parsed.data.map((d) => ({
    modelo: d.modelo,
    memoria: d.memoria,
    cor: d.cor,
    bateria: d.bateria,
    telaOriginal: d.tela_original,
    faceIdOk: d.face_id_ok,
    trueToneOk: d.true_tone_ok,
    pecasSubstituidas: d.pecas_substituidas,
    observacoes: d.observacoes,
    precoPago: d.preco_pago,
  }));
}
