import { EMOJI_COR_BASE, EMOJIS_NAO_COR } from "./emoji-cores";
import { parsePreco } from "./normalizacao";

/** Mapa de cor ESCRITA (texto) -> nome oficial. A escrita sempre vence o emoji (ver spec). */
export const COR_ESCRITA_MAP: Record<string, string> = {
  PRETO: "Preto",
  BRANCO: "Branco",
  SILVER: "Prata",
  PRATA: "Prata",
  DOURADO: "Dourado",
  LARANJA: "Laranja",
  LILAS: "Lilás",
  "LILÁS": "Lilás",
  ROSA: "Rosa",
  NATURAL: "Titânio Natural",
  "SPACE GRAY": "Cinza-espacial",
  "SPACE GREY": "Cinza-espacial",
};

const TODOS_EMOJIS_COR = Object.keys(EMOJI_COR_BASE).sort((a, b) => b.length - a.length);
const TODOS_EMOJIS_NAO_COR = Array.from(EMOJIS_NAO_COR);

/** Remove todos os emojis de cor conhecidos de uma string. */
export function removerEmojisDeCor(texto: string): string {
  let resultado = texto;
  for (const emoji of TODOS_EMOJIS_COR) {
    resultado = resultado.split(emoji).join("");
  }
  return resultado;
}

/** Remove marcadores não-cor (✅, 💰, 🔋, 📱, etc) de uma string. */
export function removerMarcadoresNaoCor(texto: string): string {
  let resultado = texto;
  for (const emoji of TODOS_EMOJIS_NAO_COR) {
    resultado = resultado.split(emoji).join("");
  }
  return resultado;
}

/** true se a linha contém um marcador de preço em R$ (formato usado pela Goat, sempre explícito). */
export function contemPrecoComRS(linha: string): boolean {
  return /R\$\s*[\d.,]/i.test(linha) || /\d[.,]\d+\s*R\$/i.test(linha);
}

/**
 * Extrai a cor ESCRITA de uma linha de cor+preço (removendo emojis e o
 * trecho do preço). Retorna null se não sobrar nenhuma palavra (ou seja,
 * a cor veio só por emoji).
 */
export function extrairCorEscrita(linha: string): string | null {
  let limpo = removerEmojisDeCor(linha);
  limpo = removerMarcadoresNaoCor(limpo);
  // remove o preço e tudo depois dele (R$... ou apenas dígitos finais)
  limpo = limpo.split(/R\$/i)[0];
  limpo = limpo.replace(/[\d.,]+\s*\$?\s*$/, "");
  limpo = limpo.replace(/^[\s.*\-:]+|[\s.*\-:]+$/g, "").trim();
  if (!limpo) return null;

  const chave = limpo.toUpperCase().replace(/\s+/g, " ").trim();
  return COR_ESCRITA_MAP[chave] ?? (chave.length > 0 ? capitalizar(limpo) : null);
}

function capitalizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

/** Extrai o primeiro valor de preço encontrado numa linha (usa parsePreco). */
export function extrairPrimeiroPreco(linha: string): number | null {
  const match = linha.match(/R\$\s*[\d.,]+|\*?[\d][\d.,]*\s*R?\$|\d[\d.,]*\$/i);
  if (match) return parsePreco(match[0]);
  // fallback: qualquer número plausível de preço na linha (>=2 dígitos)
  const generico = linha.match(/\d[\d.,]{1,9}/);
  return generico ? parsePreco(generico[0]) : null;
}

/** Extrai cidade conhecida (UDI/UDII/ARI/CAT) entre parênteses ou solta na linha. */
export function extrairCidade(linha: string): string | null {
  const match = linha.match(/\(?\s*(UDII|UDI|ARI|CAT)\s*\)?/i);
  return match ? match[1].toUpperCase() : null;
}

/** Extrai percentual de bateria de uma linha tipo "🔋72% (ARI)". */
export function extrairBateriaDaLinha(linha: string): number | null {
  const match = linha.match(/(\d{2,3})\s*%/);
  return match ? Number(match[1]) : null;
}
