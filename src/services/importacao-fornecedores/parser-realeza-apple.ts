import { resolverModeloCanonico } from "./modelo-catalogo";
import { resolverCorEmoji, extrairEmojisDeCor, deduplicarEmojis, EMOJIS_NAO_COR } from "./emoji-cores";
import { extrairArmazenamentoRam, parsePreco } from "./normalizacao";
import { COR_ESCRITA_MAP, removerEmojisDeCor, removerMarcadoresNaoCor } from "./texto-lista";
import type { ItemDescartado, ItemExtraido, ResultadoParser } from "./tipos";

/**
 * Parser determinístico pra Realeza · Apple lacrados. Formato: bloco por
 * modelo (linha do modelo, às vezes com specs entre parênteses), seguido
 * de 1+ linha(s) com emoji(s) de cor + preço, na MESMA linha do modelo
 * (formato compacto "📲iPhone-18 Pro Max (256 GB) 🔵⚫️11899") ou em
 * linha(s) separada(s) abaixo.
 *
 * Regras de associação emoji→preço (da spec):
 *  - 1 preço na linha: todos os emojis da linha (e do modelo acima, se
 *    a linha de modelo não tiver preço) pertencem a esse preço.
 *  - 2 preços na linha: os emojis imediatamente ANTES de cada preço
 *    pertencem a ele.
 *  - Várias linhas de preço sob o mesmo modelo: cada linha é seu próprio
 *    grupo de cores.
 *  - Cor pode vir ESCRITA depois do preço, numa linha à parte (Apple
 *    Watch SE-3 do fixture 2/3).
 */
export function parseRealezaAppleLacrados(textoOriginal: string): ResultadoParser {
  const blocos = dividirEmBlocos(textoOriginal);
  const itens: ItemExtraido[] = [];
  const descartados: ItemDescartado[] = [];

  for (const bloco of blocos) {
    processarBloco(bloco, itens, descartados);
  }

  return { itens, descartados };
}

/** Um "bloco" é um grupo de linhas não vazias separado por linha(s) em branco. */
function dividirEmBlocos(texto: string): string[][] {
  const linhas = texto.split("\n").map((l) => l.trim());
  const blocos: string[][] = [];
  let atual: string[] = [];
  for (const linha of linhas) {
    if (linha.length === 0) {
      if (atual.length > 0) blocos.push(atual);
      atual = [];
    } else {
      atual.push(linha);
    }
  }
  if (atual.length > 0) blocos.push(atual);
  return blocos;
}

/** Palavras que, quando aparecem logo antes/depois de um número, indicam
 * que o número é parte do NOME do modelo (ex: "iPhone-16", "S-11",
 * "SE-3", "iPhone 15"), não um preço. */
const PALAVRAS_MODELO = ["iphone", "ipad", "watch", "se", "s"];

interface PrecoEncontrado {
  valorTexto: string;
  index: number;
  fim: number;
}

/**
 * Encontra números que são candidatos plausíveis a PREÇO numa linha,
 * excluindo números que claramente são parte do modelo/spec: dentro de
 * parênteses, formato RAM "NN/NN", sufixo de armazenamento "NNNg/NNNgb",
 * ou colados a uma palavra de modelo (com ou sem hífen).
 */
function encontrarPrecos(linha: string): PrecoEncontrado[] {
  const resultados: PrecoEncontrado[] = [];
  const regexNumero = /\d[\d.,]*/g;
  let m: RegExpExecArray | null;
  while ((m = regexNumero.exec(linha)) !== null) {
    const valorTexto = m[0];
    const inicio = m.index;
    const fim = inicio + valorTexto.length;
    const antes = linha.slice(0, inicio);
    const depois = linha.slice(fim);

    // dentro de parênteses: "(256 GB)", "(46mm)"
    const aberturaAntes = antes.lastIndexOf("(");
    const fechamentoAntes = antes.lastIndexOf(")");
    if (aberturaAntes > fechamentoAntes) continue;

    // formato RAM "128/4" ou "512/12"
    if (/^\s*\//.test(depois)) continue;
    if (/\/\s*$/.test(antes)) continue;

    // sufixo de armazenamento "128g", "256G", "512gb"
    if (/^\s*g\s*b?\b/i.test(depois)) continue;

    // colado a palavra de modelo, com ou sem hífen: "iPhone-16", "iPhone 15", "S-11", "SE-3"
    const matchPalavraAntes = antes.match(/([a-zA-Z]+)[\s-]*$/);
    if (matchPalavraAntes && PALAVRAS_MODELO.includes(matchPalavraAntes[1].toLowerCase())) continue;

    // sufixo "-E" tipo "17-E" (modelo com letra depois do número)
    if (/^-[a-zA-Z]/.test(depois)) continue;

    // "mm" de tamanho: "46mm"
    if (/^\s*mm\b/i.test(depois)) continue;

    resultados.push({ valorTexto, index: inicio, fim });
  }
  return resultados;
}

/** Extrai a cor ESCRITA de um trecho de texto já sem preço (mas ainda com emojis/marcadores). */
function corEscritaDoTrecho(trecho: string): string | null {
  let limpo = removerEmojisDeCor(trecho);
  limpo = removerMarcadoresNaoCor(limpo);
  limpo = limpo.replace(/r\$/gi, " ").replace(/\$/g, " ");
  limpo = limpo.replace(/[\d.,*]+/g, " ");
  limpo = limpo.replace(/^[\s.:\-]+|[\s.:\-]+$/g, "").trim();
  if (!limpo) return null;
  const chave = limpo.toUpperCase().replace(/\s+/g, " ").trim();
  if (COR_ESCRITA_MAP[chave]) return COR_ESCRITA_MAP[chave];
  // só aceita como cor escrita se for uma palavra "razoável" (letras, até 3 palavras)
  if (/^[a-zA-ZÀ-ÿ\s]{2,20}$/.test(chave) && chave.split(" ").length <= 3) {
    return capitalizar(limpo);
  }
  return null;
}

function capitalizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

function processarBloco(linhas: string[], itens: ItemExtraido[], descartados: ItemDescartado[]) {
  if (linhas.length === 1 && /apple lacrados/i.test(linhas[0])) return;

  const textoBlocoCompleto = linhas.join(" ");
  const ehCpo = /\bcpo\b/i.test(textoBlocoCompleto);

  const linhaModelo = linhas[0];
  const resolvido = resolverModeloCanonico(linhaModelo);
  const { armazenamentoGb, ramGb, possivelTypo } = extrairArmazenamentoRam(linhaModelo);

  const precosDoModelo = encontrarPrecos(linhaModelo);
  const linhaModeloTemPreco = precosDoModelo.length > 0;
  const linhasDePreco = linhaModeloTemPreco ? linhas : linhas.slice(1);
  const emojisDoModeloSemPreco = linhaModeloTemPreco
    ? []
    : deduplicarEmojis(extrairEmojisDeCor(linhaModelo).map((e) => e.emoji));

  interface GrupoCor {
    emoji: string | null;
    corEscrita: string | null;
    preco: number;
    linhaOrigem: string;
  }
  const grupos: GrupoCor[] = [];

  for (const linha of linhasDePreco) {
    const precos = encontrarPrecos(linha);
    if (precos.length === 0) continue;

    if (precos.length === 1) {
      const emojisNaLinha = extrairEmojisDeCor(linha).map((e) => e.emoji);
      const emojisUnicos = deduplicarEmojis([...emojisDoModeloSemPreco, ...emojisNaLinha]);
      const preco = parsePreco(precos[0].valorTexto);
      if (preco === null) continue;

      const trechoSemPreco = linha.slice(0, precos[0].index) + linha.slice(precos[0].fim);
      const corEscrita = corEscritaDoTrecho(trechoSemPreco);

      if (emojisUnicos.length === 0) {
        grupos.push({ emoji: null, corEscrita, preco, linhaOrigem: linha });
      } else {
        for (const emoji of emojisUnicos) {
          grupos.push({ emoji, corEscrita, preco, linhaOrigem: linha });
        }
      }
    } else {
      for (let idx = 0; idx < precos.length; idx++) {
        const inicioTrecho = idx === 0 ? 0 : precos[idx - 1].fim;
        const fimTrecho = precos[idx].fim;
        const trecho = linha.slice(inicioTrecho, fimTrecho);
        const emojisDoTrecho = deduplicarEmojis(extrairEmojisDeCor(trecho).map((e) => e.emoji));
        const preco = parsePreco(precos[idx].valorTexto);
        if (preco === null) continue;
        const trechoSemPreco = trecho.slice(0, precos[idx].index - inicioTrecho) + trecho.slice(precos[idx].fim - inicioTrecho);
        const corEscrita = corEscritaDoTrecho(trechoSemPreco);
        if (emojisDoTrecho.length === 0) {
          grupos.push({ emoji: null, corEscrita, preco, linhaOrigem: linha });
        } else {
          for (const emoji of emojisDoTrecho) {
            grupos.push({ emoji, corEscrita, preco, linhaOrigem: linha });
          }
        }
      }
    }
  }

  if (grupos.length === 0) return;

  // "Cor escrita depois do preço": linha do bloco sem preço mas com uma
  // cor reconhecível (emoji ou palavra) — associa aos grupos que ainda
  // não têm cor, em ordem de aparição.
  const linhasSemPrecoComCor: string[] = [];
  for (const linha of linhas.slice(1)) {
    if (encontrarPrecos(linha).length > 0) continue;
    const cor = corEscritaDoTrecho(linha);
    const emoji = extrairEmojisDeCor(linha)[0]?.emoji ?? null;
    if (cor || emoji) linhasSemPrecoComCor.push(linha);
  }
  const filaCores = [...linhasSemPrecoComCor];
  for (const grupo of grupos) {
    if (!grupo.corEscrita && !grupo.emoji && filaCores.length > 0) {
      const linhaCor = filaCores.shift()!;
      grupo.corEscrita = corEscritaDoTrecho(linhaCor);
      grupo.emoji = extrairEmojisDeCor(linhaCor)[0]?.emoji ?? null;
    }
  }

  const ultimaLinha = linhasDePreco[linhasDePreco.length - 1] ?? "";
  const comentario = extrairComentarioResidual(ultimaLinha);

  for (const grupo of grupos) {
    let cor: string;
    let corBase: string;
    if (grupo.corEscrita) {
      cor = grupo.corEscrita;
      corBase = grupo.emoji ? resolverCorEmoji(grupo.emoji, resolvido.canonico).cor : grupo.corEscrita;
    } else if (grupo.emoji) {
      const r = resolverCorEmoji(grupo.emoji, resolvido.canonico);
      cor = r.cor;
      corBase = r.cor;
    } else {
      cor = "Não informada";
      corBase = "Não informada";
    }

    const item: ItemExtraido = {
      categoriaSlug: resolvido.categoriaSlug,
      marca: resolvido.marca,
      modeloCanonico: resolvido.canonico,
      modeloReconhecido: resolvido.reconhecido,
      condicao: "Lacrado",
      armazenamentoGb,
      ramGb,
      ramPossivelTypo: possivelTypo,
      conectividade: null,
      nfc: false,
      tamanhoMm: null,
      gpsCellular: null,
      cor,
      corBase,
      corEmojiOrigem: grupo.emoji,
      bateriaPct: null,
      cidade: null,
      garantia: null,
      quantidade: 1,
      tags: [],
      fornecedor: "realeza",
      tipoLista: "apple_lacrados",
      precoFornecedor: grupo.preco,
      linhaOrigem: `${linhaModelo} | ${grupo.linhaOrigem}`,
    };

    if (ehCpo) {
      descartados.push({ linhaOrigem: item.linhaOrigem, descricao: `${resolvido.canonico} ${cor}`, motivo: "cpo" });
      continue;
    }
    if (comentario) {
      descartados.push({
        linhaOrigem: item.linhaOrigem,
        descricao: `${resolvido.canonico} ${cor}`,
        motivo: "comentario",
        detalhe: comentario,
      });
      continue;
    }

    itens.push(item);
  }
}

const TERMOS_PERMITIDOS = ["5g", "4g", "nfc", "gps", "lançamento", "lancamento", "lacrado", "seminovo", "semi", "cpo", "cellular"];

const PALAVRAS_MODELO_GENERICAS = ["iphone", "ipad", "macbook", "apple", "watch", "pro", "max", "plus", "mini", "se", "neo", "ultra", "series"];

/** Extrai texto "sobrando" numa linha depois de remover modelo/spec/cor/preço/emoji/termos permitidos. */
function extrairComentarioResidual(linha: string): string | null {
  let limpo = linha.replace(/\([^)]*\)/g, " ");
  limpo = removerEmojisDeCor(limpo);
  limpo = removerMarcadoresNaoCor(limpo);
  for (const p of encontrarPrecos(limpo)) {
    limpo = limpo.slice(0, p.index) + " " + limpo.slice(p.fim);
  }
  limpo = limpo.replace(/[()*.:\-]/g, " ");
  for (const chaveCor of Object.keys(COR_ESCRITA_MAP)) {
    limpo = limpo.replace(new RegExp(`\\b${chaveCor}\\b`, "gi"), " ");
  }
  for (const termo of TERMOS_PERMITIDOS) {
    limpo = limpo.replace(new RegExp(`\\b${termo}\\b`, "gi"), " ");
  }
  for (const palavra of PALAVRAS_MODELO_GENERICAS) {
    limpo = limpo.replace(new RegExp(`\\b${palavra}\\b`, "gi"), " ");
  }
  limpo = limpo
    .replace(/\bgb\b/gi, " ")
    .replace(/\d+\s*g\b/gi, " ")
    .replace(/\bg\b/gi, " ")
    .replace(/\d+/g, " ");
  limpo = limpo.replace(/\s+/g, " ").trim();
  return limpo.length >= 3 ? limpo : null;
}
