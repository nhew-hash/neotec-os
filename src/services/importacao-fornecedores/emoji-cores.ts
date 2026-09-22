/**
 * Tabela emoji -> cor base (espelha o seed de `import_emoji_cores` na
 * migration fase230). Mantida em código também (além do banco) para os
 * parsers determinísticos poderem rodar de forma síncrona e para os
 * testes de fixture não dependerem de banco.
 *
 * IMPORTANTE: a tabela em banco (`import_emoji_cores`) é a fonte editável
 * pelo usuário; esta constante é o fallback/seed inicial e o que os
 * testes unitários dos parsers usam diretamente. O orquestrador (que já
 * fala com o banco) deve preferir a tabela do banco quando disponível —
 * ver `resolverCorEmoji` abaixo, que aceita um mapa customizado.
 */
export const EMOJI_COR_BASE: Record<string, string> = {
  "⚫": "Preto",
  "⚫️": "Preto",
  "⚪": "Branco/Prata",
  "⚪️": "Branco/Prata",
  "🔵": "Azul",
  "💚": "Verde",
  "💜": "Roxo/Lilás",
  "🟣": "Roxo/Lilás",
  "🧡": "Laranja",
  "🩶": "Cinza/Prata/Natural",
  "💛": "Amarelo/Dourado",
  "🟡": "Amarelo/Dourado",
  "🩷": "Rosa",
  "❤️": "Vermelho",
  "❤": "Vermelho",
  "🔴": "Vermelho",
};

/** Emojis que aparecem em listas mas NÃO representam cor. */
export const EMOJIS_NAO_COR = new Set([
  "✅", // disponível
  "💰", // marcador de preço
  "🔋", // bateria
  "📱", // celular
  "📲", // celular
  "💻", // notebook
  "⌚️",
  "⌚",
  "🚀", // lançamento
  "🚨", // aviso
]);

/** Regex que casa qualquer emoji "candidato a cor" conhecido na tabela. */
const EMOJIS_COR_ORDENADOS = Object.keys(EMOJI_COR_BASE).sort((a, b) => b.length - a.length);

/**
 * Catálogo oficial de cor por modelo (emoji -> nome oficial), quando a
 * spec deu um mapeamento específico. Espelha `import_modelos_catalogo`.
 * Chave: modelo canônico normalizado (minúsculo, sem espaço duplo).
 */
export const CATALOGO_CORES_POR_MODELO: Record<string, Record<string, string>> = {
  "iphone 17": {
    "💜": "Lavanda",
    "🔵": "Azul-névoa",
    "💚": "Sálvia",
    "⚫️": "Preto",
    "⚫": "Preto",
    "⚪️": "Branco",
    "⚪": "Branco",
  },
  "iphone 17 pro": {
    "⚪️": "Prata",
    "⚪": "Prata",
    "🧡": "Laranja-cósmico",
    "🔵": "Azul-intenso",
  },
  "iphone 17 pro max": {
    "⚪️": "Prata",
    "⚪": "Prata",
    "🧡": "Laranja-cósmico",
    "🔵": "Azul-intenso",
  },
};

export interface EmojiEncontrado {
  emoji: string;
  index: number;
}

/** Extrai, em ordem de aparição, todos os emojis de cor presentes numa string. */
export function extrairEmojisDeCor(texto: string): EmojiEncontrado[] {
  const encontrados: EmojiEncontrado[] = [];
  for (let i = 0; i < texto.length; i++) {
    for (const emoji of EMOJIS_COR_ORDENADOS) {
      if (texto.startsWith(emoji, i)) {
        encontrados.push({ emoji, index: i });
        break;
      }
    }
  }
  return encontrados;
}

/** Remove emojis repetidos consecutivos/duplicados na mesma linha (⚪️⚪️ = uma cor só). */
export function deduplicarEmojis(emojis: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const e of emojis) {
    const base = EMOJI_COR_BASE[e] ?? e;
    if (!vistos.has(base)) {
      vistos.add(base);
      resultado.push(e);
    }
  }
  return resultado;
}

/**
 * Resolve a cor final de um emoji para um modelo específico: usa o
 * catálogo oficial se existir uma entrada pro modelo, senão cai pra cor
 * base. `modeloCanonico` deve já vir normalizado (lowercase).
 */
export function resolverCorEmoji(emoji: string, modeloCanonico?: string | null): { cor: string; temCatalogoOficial: boolean } {
  if (modeloCanonico) {
    const catalogo = CATALOGO_CORES_POR_MODELO[modeloCanonico.toLowerCase().trim()];
    if (catalogo && catalogo[emoji]) {
      return { cor: catalogo[emoji], temCatalogoOficial: true };
    }
  }
  const corBase = EMOJI_COR_BASE[emoji];
  if (corBase) return { cor: corBase, temCatalogoOficial: false };
  return { cor: "Não informada", temCatalogoOficial: false };
}
