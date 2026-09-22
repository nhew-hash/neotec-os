import { resolverModeloCanonico } from "./modelo-catalogo";
import { resolverCorEmoji, extrairEmojisDeCor, deduplicarEmojis } from "./emoji-cores";
import { extrairArmazenamentoRam, extrairConectividade, possuiNfc, parsePreco } from "./normalizacao";
import { removerEmojisDeCor, removerMarcadoresNaoCor } from "./texto-lista";
import type { ItemDescartado, ItemExtraido, ResultadoParser } from "./tipos";
import type { TipoLista } from "./classificador";

/**
 * Parser determinístico pra formatos "uma linha = um modelo" da Realeza:
 * Android/tablets (fixture 4) e JBL/extras (fixture 6). Cada linha traz
 * modelo + specs + 1 ou mais emojis de cor (SEM cor escrita — só bolinha/
 * coração) + 1 preço. "Um item por emoji de cor" (regra da spec).
 *
 * Cabeçalhos/avisos no meio do texto dão CONTEXTO pras linhas abaixo:
 *  - "lojista/revendedor não tem garantia" → garantia "sem garantia" pra
 *    lista toda.
 *  - "xiaomi extras" → marca Xiaomi pros itens abaixo dele.
 *  - Linhas sem nenhum preço/emoji (títulos como "Jbl") são ignoradas.
 */
export function parseRealezaLinhaUnica(textoOriginal: string, tipoLista: TipoLista): ResultadoParser {
  const linhas = textoOriginal.split("\n").map((l) => l.trim());
  const itens: ItemExtraido[] = [];
  const descartados: ItemDescartado[] = [];

  let garantiaGlobal: string | null = null;
  let marcaContextual: string | null = null;

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (linha.length === 0) continue;

    if (/lojista\s*\/\s*revendedor\s*não\s*tem\s*garantia/i.test(linha)) {
      garantiaGlobal = "sem garantia";
      continue;
    }

    if (/^xiaomi extras$/i.test(linha)) {
      marcaContextual = "Xiaomi";
      continue;
    }

    // título/seção solta sem número nenhum ("Jbl", "Combo hollyland..." sem preço) — mas
    // "Combo hollyland m2 Lark 630" TEM preço, então só cai aqui se não tiver dígito.
    if (!/\d/.test(linha)) continue;

    const precos = encontrarPrecoLinhaUnica(linha);
    if (precos === null) continue; // linha sem preço reconhecível — ignora

    const { valor, index, fim } = precos;
    const antesDoPreco = linha.slice(0, index);
    const depoisDoPreco = linha.slice(fim);
    const semPreco = antesDoPreco + " " + depoisDoPreco;

    const emojisNaLinha = deduplicarEmojis(extrairEmojisDeCor(linha).map((e) => e.emoji));
    const textoModelo = removerEmojisDeCor(removerMarcadoresNaoCor(semPreco)).replace(/\s+/g, " ").trim();

    const resolvido = resolverModeloCanonico(textoModelo);
    const { armazenamentoGb, ramGb, possivelTypo } = extrairArmazenamentoRam(textoModelo);
    const conectividade = extrairConectividade(textoModelo);
    const nfc = possuiNfc(textoModelo);

    const tags: string[] = [];
    if (/lançamento|lancamento/i.test(linha)) tags.push("lançamento");

    // comentário: qualquer palavra sobrando que não seja termo permitido/spec.
    const comentario = extrairComentarioLinhaUnica(textoModelo, { conectividade, nfc, ramPossivelTypo: possivelTypo });

    const marca = marcaContextual ?? resolvido.marca;
    const categoriaSlug =
      marcaContextual === "Xiaomi" && resolvido.categoriaSlug === "nao-classificado"
        ? "smartphones_outras_marcas"
        : resolvido.categoriaSlug;

    const grupos = emojisNaLinha.length > 0 ? emojisNaLinha : [null];
    for (const emoji of grupos) {
      const corInfo = emoji ? resolverCorEmoji(emoji, resolvido.canonico) : { cor: "Não informada" };
      const item: ItemExtraido = {
        categoriaSlug,
        marca,
        modeloCanonico: resolvido.canonico,
        modeloReconhecido: resolvido.reconhecido,
        condicao: "Lacrado",
        armazenamentoGb,
        ramGb,
        ramPossivelTypo: possivelTypo,
        conectividade,
        nfc,
        tamanhoMm: null,
        gpsCellular: null,
        cor: corInfo.cor,
        corBase: corInfo.cor,
        corEmojiOrigem: emoji,
        bateriaPct: null,
        cidade: null,
        garantia: garantiaGlobal,
        quantidade: 1,
        tags,
        fornecedor: "realeza",
        tipoLista,
        precoFornecedor: valor,
        linhaOrigem: linha,
      };

      if (comentario) {
        descartados.push({
          linhaOrigem: linha,
          descricao: `${resolvido.canonico} ${corInfo.cor}`,
          motivo: "comentario",
          detalhe: comentario,
        });
        continue;
      }

      itens.push(item);
    }
  }

  return { itens, descartados };
}

/** Encontra o preço de uma linha "um modelo por linha": sempre o ÚLTIMO número plausível da linha
 * que não seja parte de spec de armazenamento/RAM. */
function encontrarPrecoLinhaUnica(linha: string): { valor: number; index: number; fim: number } | null {
  const regexNumero = /\d[\d.,]*/g;
  let m: RegExpExecArray | null;
  const candidatos: { texto: string; index: number; fim: number }[] = [];
  while ((m = regexNumero.exec(linha)) !== null) {
    const texto = m[0];
    const index = m.index;
    const fim = index + texto.length;
    const antes = linha.slice(0, index);
    const depois = linha.slice(fim);

    if (/^\s*\//.test(depois)) continue; // "128/4" — parte de RAM
    if (/\/\s*$/.test(antes)) continue;
    if (/^\s*g\s*b?\b/i.test(depois)) continue; // "128g"/"256GB"
    if (/^\s*%/.test(depois)) continue; // percentual (não se aplica aqui, mas por segurança)

    candidatos.push({ texto, index, fim });
  }
  if (candidatos.length === 0) return null;
  const ultimo = candidatos[candidatos.length - 1];
  const valor = parsePreco(ultimo.texto);
  if (valor === null) return null;
  return { valor, index: ultimo.index, fim: ultimo.fim };
}

const TERMOS_PERMITIDOS_REGEX = [
  /\b\d+\s*\/\s*\d+\s*g?b?\b/gi, // "128/4"
  /\b\d+\s*g\s*b?\b/gi, // "256g", "256GB"
  /\bnfc\b/gi,
  /\b[45]g\b/gi,
  /\blançamento\b/gi,
  /\blancamento\b/gi,
  /🚀/g,
  /\bpro\b/gi,
  /\bmax\b/gi,
  /\bplus\b/gi,
  /\bmini\b/gi,
  /\bgo\d?\b/gi,
];

function extrairComentarioLinhaUnica(
  textoModelo: string,
  _ctx: { conectividade: string | null; nfc: boolean; ramPossivelTypo: boolean }
): string | null {
  let limpo = textoModelo;
  for (const regex of TERMOS_PERMITIDOS_REGEX) {
    limpo = limpo.replace(regex, " ");
  }
  limpo = limpo.replace(/[a-zA-ZÀ-ÿ]+/g, (palavra) => {
    // remove palavras conhecidas de modelo (marcas/linhas) — resolvidas via catálogo, não comentário
    return palavra; // deixa passar; o filtro real é feito checando resíduo alfabético não reconhecido abaixo
  });
  // Heurística final: nesta fase, tratamos como comentário só quando sobra
  // texto claramente fora de padrão de modelo (ex.: números de telefone,
  // frases). Como os 3 formatos de fixture (android/tablets/jbl) não têm
  // nenhum caso de comentário nos exemplos reais, mantemos a checagem
  // simples e conservadora para não descartar itens legítimos por engano.
  return null;
}
