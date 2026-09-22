/**
 * Funções puras de normalização usadas pelos parsers de fornecedor
 * (Goat / Realeza). Nenhuma dependência de banco ou IA — tudo
 * determinístico e testável isoladamente.
 */

/**
 * Converte qualquer um dos formatos de preço documentados na spec para número.
 *
 * Formatos aceitos: "R$7.300,00", "R$2000,00", "3.499 R$", "5270R$",
 * "7349$", "*6799", "200,0", "449,", "6799", "6.799".
 *
 * Regra: primeiro remove tudo que não é dígito, vírgula ou ponto.
 * Depois decide se vírgula/ponto são separador de milhar ou decimal:
 *  - Se tem os dois (ponto E vírgula), o último símbolo que aparece é o
 *    decimal (padrão BR: milhar=ponto, decimal=vírgula → "7.300,00").
 *  - Se tem só vírgula: se houver 1-2 dígitos depois dela, é decimal
 *    ("200,0" → 200.0); "449," (nada depois) → trata como decimal vazio → 449.
 *  - Se tem só ponto: se houver exatamente 3 dígitos após o ÚLTIMO ponto
 *    E mais de um grupo, é separador de milhar ("6.799" → 6799). Se só
 *    1-2 dígitos depois, é decimal.
 */
export function parsePreco(bruto: string | null | undefined): number | null {
  if (!bruto) return null;

  // Remove símbolos de moeda, marcador de preço, asterisco e espaços.
  let s = bruto
    .replace(/R\$/gi, "")
    .replace(/\$/g, "")
    .replace(/💰/g, "")
    .replace(/\*/g, "")
    .trim();

  // Sobra só dígitos, pontos e vírgulas (descarta qualquer outro lixo).
  const match = s.match(/[\d.,]+/);
  if (!match) return null;
  s = match[0];

  // Remove pontuação nas pontas ("449," ou ",449" ou ".449").
  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");

  let normalizado: string;

  if (temPonto && temVirgula) {
    // Padrão BR: o símbolo que aparece por último é o separador decimal.
    const ultimoPonto = s.lastIndexOf(".");
    const ultimaVirgula = s.lastIndexOf(",");
    if (ultimaVirgula > ultimoPonto) {
      // vírgula é decimal, ponto é milhar
      normalizado = s.replace(/\./g, "").replace(",", ".");
    } else {
      // ponto é decimal, vírgula é milhar
      normalizado = s.replace(/,/g, "");
    }
  } else if (temVirgula) {
    const partes = s.split(",");
    const depoisVirgula = partes[partes.length - 1];
    if (depoisVirgula.length === 0) {
      // "449," → decimal vazio, trata como sem decimal
      normalizado = partes.slice(0, -1).join("");
    } else if (depoisVirgula.length <= 2) {
      // decimal: "200,0" → 200.0 ; "7300,00" -> 7300.00
      normalizado = partes.slice(0, -1).join("") + "." + depoisVirgula;
    } else {
      // vírgula usada como milhar (raro, mas por segurança)
      normalizado = s.replace(/,/g, "");
    }
  } else if (temPonto) {
    const partes = s.split(".");
    const depoisPonto = partes[partes.length - 1];
    if (partes.length > 1 && depoisPonto.length === 3) {
      // separador de milhar: "6.799" -> 6799 ; "3.499" -> 3499
      normalizado = s.replace(/\./g, "");
    } else {
      // decimal: "6799.00" (improvável mas aceito), ou número já simples
      normalizado = s;
    }
  } else {
    normalizado = s;
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return valor;
}

/** Normaliza nomes de cidade conhecidos ("UDII" -> "UDI", etc). */
const CIDADES_CONHECIDAS: Record<string, string> = {
  UDI: "UDI",
  UDII: "UDI",
  UBERLANDIA: "UDI",
  ARI: "ARI",
  ARAGUARI: "ARI",
  CAT: "CAT",
  CATALAO: "CAT",
};

export function normalizarCidade(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const chave = bruto
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos
  return CIDADES_CONHECIDAS[chave] ?? bruto.trim().toUpperCase();
}

/**
 * Extrai um percentual de bateria de um trecho de texto, ex: "Bat 85%",
 * "bateria: 92%", "78%". Retorna null se não encontrar.
 */
export function extrairBateriaPct(texto: string): number | null {
  const match = texto.match(/(\d{2,3})\s*%/);
  if (!match) return null;
  const valor = Number(match[1]);
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null;
  return valor;
}

/**
 * Extrai armazenamento (GB) e RAM (GB) de trechos como "128/4", "256G",
 * "64/4🔵", "258/8" (flagra como possível typo de 256).
 */
export interface ArmazenamentoRam {
  armazenamentoGb: number | null;
  ramGb: number | null;
  possivelTypo: boolean;
}

const ARMAZENAMENTOS_VALIDOS = [16, 32, 64, 128, 256, 512, 1024, 2048];

export function extrairArmazenamentoRam(texto: string): ArmazenamentoRam {
  // Formato "128/4" ou "258/8"
  const comBarra = texto.match(/(\d{2,4})\s*\/\s*(\d{1,3})/);
  if (comBarra) {
    const armazenamento = Number(comBarra[1]);
    const ram = Number(comBarra[2]);
    const possivelTypo = !ARMAZENAMENTOS_VALIDOS.includes(armazenamento);
    return { armazenamentoGb: armazenamento, ramGb: ram, possivelTypo };
  }

  // Formato "256G" / "256GB" / "256g" isolado (sem RAM explícita)
  const soArmazenamento = texto.match(/(\d{2,4})\s*[Gg][Bb]?\b/);
  if (soArmazenamento) {
    const armazenamento = Number(soArmazenamento[1]);
    const possivelTypo = !ARMAZENAMENTOS_VALIDOS.includes(armazenamento);
    return { armazenamentoGb: armazenamento, ramGb: null, possivelTypo };
  }

  return { armazenamentoGb: null, ramGb: null, possivelTypo: false };
}

/** Remove variantes de acentuação/caixa pra comparação frouxa de texto. */
export function normalizarParaComparacao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta conectividade (4G/5G) mencionada no texto. */
export function extrairConectividade(texto: string): "4G" | "5G" | null {
  if (/\b5g\b/i.test(texto)) return "5G";
  if (/\b4g\b/i.test(texto)) return "4G";
  return null;
}

/** Detecta menção a NFC no texto. */
export function possuiNfc(texto: string): boolean {
  return /\bnfc\b/i.test(texto);
}

/** Detecta menção a GPS/cellular (para Apple Watch). */
export function extrairGpsCellular(texto: string): "GPS" | "GPS+Cellular" | null {
  if (/gps\s*\+?\s*cellular/i.test(texto)) return "GPS+Cellular";
  if (/\bgps\b/i.test(texto)) return "GPS";
  return null;
}

/** Extrai tamanho em mm (ex: Apple Watch "46mm", "41mm"). */
export function extrairTamanhoMm(texto: string): number | null {
  const match = texto.match(/(\d{2})\s*mm/i);
  if (!match) return null;
  return Number(match[1]);
}
