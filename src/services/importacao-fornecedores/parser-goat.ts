import { resolverModeloCanonico } from "./modelo-catalogo";
import { resolverCorEmoji, extrairEmojisDeCor, deduplicarEmojis } from "./emoji-cores";
import { extrairArmazenamentoRam, normalizarCidade } from "./normalizacao";
import {
  contemPrecoComRS,
  extrairCorEscrita,
  extrairPrimeiroPreco,
  extrairCidade,
  extrairBateriaDaLinha,
  removerEmojisDeCor,
  removerMarcadoresNaoCor,
} from "./texto-lista";
import type { ItemDescartado, ItemExtraido, ResultadoParser } from "./tipos";

/**
 * Parser determinístico (state-machine linha-a-linha) para o formato da
 * Goat: uma lista completa por mensagem, cor sempre ESCRITA (com emoji
 * ao lado), condição (Lacrado/Seminovo) inferida pela presença ou não
 * de uma linha de bateria logo depois da linha de cor+preço — em vez de
 * depender de rastrear o header de seção, o que se mostrou desnecessário
 * dado que todo item Lacrado da Goat não tem % de bateria e todo item
 * Seminovo tem.
 *
 * Uma linha só é confirmada como "linha de modelo" se a PRÓXIMA linha
 * não-vazia for uma linha de cor+preço (contém "R$"). Isso evita tratar
 * cabeçalhos/avisos como modelo.
 */
export function parseGoat(textoOriginal: string): ResultadoParser {
  const linhasBrutas = textoOriginal.split("\n").map((l) => l.trim());
  const itens: ItemExtraido[] = [];
  const descartados: ItemDescartado[] = [];

  let modeloAtivo: string | null = null;
  let garantiaAtual: string | null = null;

  const proximaLinhaNaoVazia = (aPartirDe: number): string | null => {
    for (let j = aPartirDe; j < linhasBrutas.length; j++) {
      if (linhasBrutas[j].length > 0) return linhasBrutas[j];
    }
    return null;
  };

  let i = 0;
  while (i < linhasBrutas.length) {
    const linha = linhasBrutas[i];

    if (linha.length === 0) {
      i++;
      continue;
    }

    // Aviso avulso.
    if (linha.startsWith("🚨")) {
      i++;
      continue;
    }

    // Links / rodapé de comunidade.
    if (/^https?:\/\//i.test(linha) || /chat\.whatsapp\.com/i.test(linha) || /link da nossa comunidade/i.test(linha)) {
      i++;
      continue;
    }

    // Separadores (linhas de só underscore/traço/barra).
    if (/^[_\-—/)\s]{3,}$/.test(linha)) {
      garantiaAtual = null;
      i++;
      continue;
    }

    // Cabeçalho "IPHONE LACRADO ... GARANTIA ... APPLE".
    if (/lacrado/i.test(linha) && /garantia/i.test(linha)) {
      const matchAno = linha.match(/(\d+)\s*ano/i);
      garantiaAtual = matchAno ? `${matchAno[1]} ano de garantia` : "garantia de fábrica";
      i++;
      continue;
    }

    // Cabeçalho "IPHONES SEMI NOVOS *( 30 dias de garantia )".
    if (/semi\s*novos?/i.test(linha)) {
      const matchDias = linha.match(/(\d+)\s*dias/i);
      garantiaAtual = matchDias ? `${matchDias[1]} dias de garantia` : null;
      i++;
      continue;
    }

    // Linha de cor + preço, associada ao modelo ativo.
    if (contemPrecoComRS(linha)) {
      if (!modeloAtivo) {
        // Cor+preço sem modelo confirmado antes — não deveria acontecer
        // num texto bem formado; ignora com segurança.
        i++;
        continue;
      }

      const preco = extrairPrimeiroPreco(linha);
      const corEscrita = extrairCorEscrita(linha);
      const emojisNaLinha = deduplicarEmojis(extrairEmojisDeCor(linha).map((e) => e.emoji));
      const emojiOrigem = emojisNaLinha[0] ?? null;

      // Olha a(s) próxima(s) linha(s) em busca de bateria/cidade.
      let bateriaPct: number | null = null;
      let cidade: string | null = null;
      let cursor = i + 1;
      // até 2 linhas seguintes podem carregar bateria/cidade antes do próximo item real
      for (let k = 0; k < 2 && cursor < linhasBrutas.length; k++, cursor++) {
        const seguinte = linhasBrutas[cursor];
        if (seguinte.length === 0) continue;
        if (contemPrecoComRS(seguinte)) break; // já é o próximo item, não consome
        const bat = extrairBateriaDaLinha(seguinte);
        const cid = extrairCidade(seguinte);
        if (bat !== null) bateriaPct = bat;
        if (cid !== null) cidade = normalizarCidade(cid);
        if (bat !== null || cid !== null) {
          i = cursor; // consome essa linha
        } else {
          break;
        }
      }

      const condicao = bateriaPct !== null ? "Seminovo" : "Lacrado";
      const resolvido = resolverModeloCanonico(modeloAtivo);
      const { armazenamentoGb, ramGb, possivelTypo } = extrairArmazenamentoRam(modeloAtivo);

      let cor: string;
      let corBase: string;
      if (corEscrita) {
        cor = corEscrita;
        corBase = emojiOrigem ? resolverCorEmoji(emojiOrigem, resolvido.canonico).cor : corEscrita;
      } else if (emojiOrigem) {
        const r = resolverCorEmoji(emojiOrigem, resolvido.canonico);
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
        condicao,
        armazenamentoGb,
        ramGb,
        ramPossivelTypo: possivelTypo,
        conectividade: null,
        nfc: false,
        tamanhoMm: null,
        gpsCellular: null,
        cor,
        corBase,
        corEmojiOrigem: emojiOrigem,
        bateriaPct,
        cidade,
        garantia: garantiaAtual,
        quantidade: 1,
        tags: [],
        fornecedor: "goat",
        tipoLista: "goat_completa",
        precoFornecedor: preco ?? 0,
        linhaOrigem: `${modeloAtivo} | ${linha}`,
      };

      // Regra 1: iPhone lacrado só da Realeza — descarta iPhone lacrado da Goat.
      if (condicao === "Lacrado" && /iphone/i.test(resolvido.canonico)) {
        descartados.push({
          linhaOrigem: item.linhaOrigem,
          descricao: `${resolvido.canonico} ${cor}`,
          motivo: "iphone_lacrado_goat",
        });
        i++;
        continue;
      }

      // Regra 2: seminovo com bateria < 80% descartado.
      if (condicao === "Seminovo" && bateriaPct !== null && bateriaPct < 80) {
        descartados.push({
          linhaOrigem: item.linhaOrigem,
          descricao: `${resolvido.canonico} ${cor} ${bateriaPct}%`,
          motivo: "bateria_baixa",
          detalhe: `${bateriaPct}%`,
        });
        i++;
        continue;
      }

      if (preco === null) {
        descartados.push({
          linhaOrigem: item.linhaOrigem,
          descricao: `${resolvido.canonico} ${cor}`,
          motivo: "preco_invalido",
        });
        i++;
        continue;
      }

      itens.push(item);
      i++;
      continue;
    }

    // Candidata a linha de modelo: só confirma se a próxima linha não-vazia for cor+preço.
    const proxima = proximaLinhaNaoVazia(i + 1);
    if (proxima && contemPrecoComRS(proxima)) {
      modeloAtivo = removerMarcadoresNaoCor(linha).replace(/^[*\s]+|[*\s]+$/g, "").trim();
      i++;
      continue;
    }

    // Não reconhecido como modelo nem como cor/preço — ignora (header/lixo).
    i++;
  }

  return { itens, descartados };
}
