export type Fornecedor = "goat" | "realeza";

export type TipoLista =
  | "goat_completa"
  | "apple_lacrados"
  | "apple_seminovos"
  | "android"
  | "perfumes"
  | "audio_extras";

export interface ResultadoClassificacao {
  classificacao: "lista" | "ignorar" | "tipo_desconhecido";
  tipoLista: TipoLista | null;
  /** Presente somente quando classificacao === "tipo_desconhecido" (pergunta a fazer no WhatsApp). */
  motivoIncerteza?: string;
}

/**
 * Uma linha "parece produto" quando tem um número de 2 a 6 dígitos que
 * pode ser preço (evita casar só ano/percentual isolado, ainda que
 * grosseiro — o parser de verdade faz o trabalho fino depois).
 */
const REGEX_NUMERO_PRECO = /\d{2,6}(?:[.,]\d{2,3})?/g;

function contarLinhasComPreco(texto: string): number {
  const linhas = texto.split("\n");
  let contador = 0;
  for (const linhaOriginal of linhas) {
    // ignora linhas que são só bateria (ex: "🔋72% (ARI)") — têm % junto do número.
    const linha = linhaOriginal.replace(/\d+\s*%/g, "");
    const numeros = linha.match(REGEX_NUMERO_PRECO);
    if (numeros && numeros.length > 0) contador++;
  }
  return contador;
}

/**
 * Classifica uma mensagem já atribuída a uma fonte conhecida (goat ou
 * realeza — a atribuição de fonte em si é feita a partir do grupo/autor
 * antes de chegar aqui, ver `import_fontes`).
 */
export function classificarMensagem(texto: string, fornecedor: Fornecedor): ResultadoClassificacao {
  const linhasComPreco = contarLinhasComPreco(texto);

  if (fornecedor === "goat") {
    // Goat manda sempre uma lista completa só; um aviso avulso não tem
    // várias linhas de modelo+preço.
    if (linhasComPreco < 2) {
      return { classificacao: "ignorar", tipoLista: null };
    }
    return { classificacao: "lista", tipoLista: "goat_completa" };
  }

  // Realeza: decide o tipo pelo conteúdo/cabeçalho.
  const normalizado = texto.toLowerCase();

  const pareceApple =
    /apple lacrados/.test(normalizado) ||
    /iphone[-\s]/.test(normalizado) ||
    /macbook/.test(normalizado) ||
    /apple watch/.test(normalizado);

  // Fase 244: cabeçalho específico da lista de seminovos da Realeza, ex:
  // "*semi novos 30 dias de garantia*" — formato compacto sem a palavra
  // "iphone" escrita (só número), então não cai no `pareceApple` acima.
  const pareceAppleSeminovo = /semi\s*novos?[^\n]{0,25}garantia/.test(normalizado);

  const parecePerfume =
    /perfumes? árabes?/.test(normalizado) ||
    /\bkit\b.*\bpcs\b/.test(normalizado) ||
    (/\bpcs\b/.test(normalizado) && linhasComPreco > 3);

  const pareceAudioExtras =
    /^jbl\b/m.test(normalizado) ||
    /\bjbl\b/.test(normalizado) ||
    /triciclo|patinete/.test(normalizado) ||
    /robô aspirador|robo aspirador/.test(normalizado) ||
    /xiaomi extras/.test(normalizado) ||
    /caixa\s+de\s+som|caixinha\s+de\s+som/.test(normalizado) ||
    /microfone/.test(normalizado) ||
    /notebook|note\s*book/.test(normalizado);

  const pareceAndroid =
    /lojista\/revendedor/.test(normalizado) ||
    /\btablet\b/.test(normalizado) ||
    /\bredmi\b/.test(normalizado) ||
    /\bpoco\b/.test(normalizado) ||
    /\bsamsung\b/.test(normalizado) ||
    /\bitel\d/.test(normalizado) ||
    /spark go/.test(normalizado);

  // Mensagens avulsas/conversa (sem estrutura de lista) → ignorar.
  if (linhasComPreco < 2 && !pareceApple && !pareceAppleSeminovo && !parecePerfume && !pareceAudioExtras && !pareceAndroid) {
    return { classificacao: "ignorar", tipoLista: null };
  }
  // Mesmo com 1-2 números, uma frase corrida de aviso/conversa não é lista.
  if (linhasComPreco <= 1) {
    return { classificacao: "ignorar", tipoLista: null };
  }

  // Prioridade: cabeçalhos explícitos primeiro, depois pistas de conteúdo.
  // audio_extras e android podem colidir (JBL + tablets no mesmo texto,
  // como na fixture 6), então checa pistas mais específicas primeiro.
  if (pareceAudioExtras && !pareceApple) return { classificacao: "lista", tipoLista: "audio_extras" };
  if (parecePerfume) return { classificacao: "lista", tipoLista: "perfumes" };
  if (pareceAppleSeminovo) return { classificacao: "lista", tipoLista: "apple_seminovos" };
  if (pareceApple) return { classificacao: "lista", tipoLista: "apple_lacrados" };
  if (pareceAndroid) return { classificacao: "lista", tipoLista: "android" };

  return {
    classificacao: "tipo_desconhecido",
    tipoLista: null,
    motivoIncerteza: "Não consegui identificar o tipo da lista (Apple lacrados, Android, Perfumes ou JBL/extras).",
  };
}
