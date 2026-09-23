import { resolverCorEmoji, extrairEmojisDeCor } from "./emoji-cores";
import { parsePreco } from "./normalizacao";
import type { ItemDescartado, ItemExtraido, ResultadoParser } from "./tipos";

/**
 * Parser determinístico pra Realeza · iPhone seminovo ("*semi novos 30
 * dias de garantia*"). Formato compacto de 1 linha por modelo, bem
 * diferente do Apple lacrados (`parser-realeza-apple.ts`):
 *
 *   📲13 128G 85%🔵 1780,0
 *   📲13 256G 90% 100%🔵 86%💜1899,0
 *   📲14 PLUS 84% 128G🔵2149,0
 *
 * Regras observadas na mensagem real do dono (23/09/2026, ver
 * FIXTURE_8_REALEZA_APPLE_SEMINOVOS):
 *  - Modelo é só o NÚMERO (sem a palavra "iPhone"), com sufixo opcional
 *    "PRO", "PRO MAX", "PLUS" ou "E" (16E) — sempre Apple, o cabeçalho
 *    da lista já garante isso, então não passa pelo catálogo geral
 *    (`resolverModeloCanonico`), que espera "iphone" escrito.
 *  - Armazenamento ("128G"/"256G") pode vir ANTES ou DEPOIS da(s)
 *    bateria(s) — a ordem não é fixa (fornecedor digita à mão).
 *  - 1 preço por linha, sempre no fim — vale pra TODAS as unidades
 *    daquela linha (mesmo modelo/armazenamento, unidades físicas
 *    diferentes no mesmo preço).
 *  - Uma linha pode ter VÁRIAS unidades (1 bateria% + 1 cor cada).
 *    Associação bateria→cor, na ordem em que aparecem no texto:
 *      - várias baterias em sequência seguidas de UM emoji → todas
 *        pertencem a essa cor (ex: "90% 100%🔵" = 2 unidades azuis);
 *      - um ou mais emojis aparecendo ANTES de uma bateria ainda sem
 *        par → casam em ordem com as próximas baterias (ex:
 *        "🩶💛90%91%" = 90%🩶 e 91%💛).
 *  - Texto livre no meio da linha (ex: "tela com um trincadinho",
 *    "tampa traseira trocada") é uma observação da unidade — vira tag
 *    informativa, não bloqueia nem descarta o item.
 *  - "🧨" antes do modelo é um marcador de atenção do fornecedor (o
 *    motivo exato ainda não foi confirmado com o dono) — só vira tag
 *    "atencao", não muda o parsing nem descarta sozinho.
 *  - Bateria < 80% é descartada aqui mesmo (mesma regra do Goat), com
 *    motivo "bateria_baixa" — a validação final (`validacao.ts`) é só
 *    rede de segurança.
 */
export function parseRealezaAppleSeminovos(textoOriginal: string): ResultadoParser {
  const itens: ItemExtraido[] = [];
  const descartados: ItemDescartado[] = [];

  const garantia = extrairGarantia(textoOriginal);

  const linhas = textoOriginal
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const linha of linhas) {
    if (!linha.includes("📲")) continue; // cabeçalho/aviso, não é linha de produto
    processarLinha(linha, garantia, itens, descartados);
  }

  return { itens, descartados };
}

function extrairGarantia(texto: string): string | null {
  const m = texto.match(/(\d+)\s*dias?\s*de\s*garantia/i);
  return m ? `${m[1]} dias` : null;
}

const REGEX_MODELO = /^(\d{2})\s*(pro\s*max|pro|plus|e)?\b/i;

function canonicoDoModelo(numero: string, sufixoBruto: string): string {
  const sufixo = sufixoBruto.toLowerCase().replace(/\s+/g, " ").trim();
  if (sufixo === "pro max") return `iPhone ${numero} Pro Max`;
  if (sufixo === "pro") return `iPhone ${numero} Pro`;
  if (sufixo === "plus") return `iPhone ${numero} Plus`;
  if (sufixo === "e") return `iPhone ${numero}e`;
  return `iPhone ${numero}`;
}

type Token = { tipo: "bateria"; valor: number; index: number; len: number } | { tipo: "emoji"; valor: string; index: number; len: number };

function processarLinha(linhaOriginal: string, garantia: string | null, itens: ItemExtraido[], descartados: ItemDescartado[]) {
  const temAtencao = linhaOriginal.includes("🧨");
  let linha = linhaOriginal.split("🧨").join("");
  linha = linha.replace(/📲/g, "").trim();

  const precos = [...linha.matchAll(/\d[\d.,]*/g)];
  const ultimoPreco = precos[precos.length - 1];
  if (!ultimoPreco) {
    descartados.push({ linhaOrigem: linhaOriginal, descricao: linha, motivo: "preco_invalido" });
    return;
  }
  const preco = parsePreco(ultimoPreco[0]);
  if (preco === null) {
    descartados.push({ linhaOrigem: linhaOriginal, descricao: linha, motivo: "preco_invalido" });
    return;
  }
  const corpo = linha.slice(0, ultimoPreco.index).trim();

  const modeloMatch = corpo.match(REGEX_MODELO);
  if (!modeloMatch) {
    descartados.push({ linhaOrigem: linhaOriginal, descricao: corpo, motivo: "ambiguo", detalhe: "modelo não identificado" });
    return;
  }
  const modeloCanonico = canonicoDoModelo(modeloMatch[1], modeloMatch[2] ?? "");

  let resto = corpo.slice(modeloMatch[0].length);

  // armazenamento: pode vir antes ou depois da bateria, então procura em
  // qualquer posição do resto (não só logo após o modelo).
  let armazenamentoGb: number | null = null;
  const storageMatch = resto.match(/(\d{2,4})\s*g\b/i);
  if (storageMatch && storageMatch.index !== undefined) {
    armazenamentoGb = Number(storageMatch[1]);
    resto = resto.slice(0, storageMatch.index) + " " + resto.slice(storageMatch.index + storageMatch[0].length);
  }

  // tokens de bateria (%) e emoji de cor, na ordem em que aparecem no texto.
  const tokens: Token[] = [];
  for (const m of resto.matchAll(/(\d{2,3})\s*%/g)) {
    tokens.push({ tipo: "bateria", valor: Number(m[1]), index: m.index!, len: m[0].length });
  }
  for (const e of extrairEmojisDeCor(resto)) {
    tokens.push({ tipo: "emoji", valor: e.emoji, index: e.index, len: e.emoji.length });
  }
  tokens.sort((a, b) => a.index - b.index);

  interface Unidade {
    bateria: number;
    emoji: string | null;
  }
  const unidades: Unidade[] = [];
  const pendentesBateria: number[] = [];
  const pendentesEmoji: string[] = [];
  for (const t of tokens) {
    if (t.tipo === "bateria") {
      if (pendentesEmoji.length > 0) {
        const emoji = pendentesEmoji.shift()!;
        unidades.push({ bateria: t.valor, emoji });
      } else {
        pendentesBateria.push(t.valor);
      }
    } else {
      if (pendentesBateria.length > 0) {
        for (const b of pendentesBateria) unidades.push({ bateria: b, emoji: t.valor });
        pendentesBateria.length = 0;
      } else {
        pendentesEmoji.push(t.valor);
      }
    }
  }
  // baterias sem emoji algum na linha inteira (raro) → cor "Não informada"
  for (const b of pendentesBateria) unidades.push({ bateria: b, emoji: null });
  // emoji(s) sobrando sem bateria pra casar: informação insuficiente pra
  // formar uma unidade, descartado silenciosamente (não tem preço/bateria
  // pra registrar sozinho).

  if (unidades.length === 0) {
    descartados.push({ linhaOrigem: linhaOriginal, descricao: modeloCanonico, motivo: "bateria_nao_informada" });
    return;
  }

  // observação livre residual: tudo que sobra depois de remover os
  // tokens de bateria/cor já identificados (ex: "tela com um trincadinho").
  let textoResidual = resto;
  const intervalosOrdenados = tokens.map((t) => ({ inicio: t.index, fim: t.index + t.len })).sort((a, b) => b.inicio - a.inicio);
  for (const { inicio, fim } of intervalosOrdenados) {
    textoResidual = textoResidual.slice(0, inicio) + " " + textoResidual.slice(fim);
  }
  textoResidual = textoResidual.replace(/[%\s]+/g, " ").trim();
  const observacao = textoResidual.length >= 3 ? textoResidual : null;

  const tagsBase: string[] = [];
  if (temAtencao) tagsBase.push("atencao");
  if (observacao) tagsBase.push(observacao);

  for (const unidade of unidades) {
    if (unidade.bateria < 80) {
      descartados.push({
        linhaOrigem: linhaOriginal,
        descricao: `${modeloCanonico} ${unidade.bateria}%`,
        motivo: "bateria_baixa",
        detalhe: `${unidade.bateria}%`,
      });
      continue;
    }

    const cor = unidade.emoji ? resolverCorEmoji(unidade.emoji, modeloCanonico).cor : "Não informada";

    const item: ItemExtraido = {
      categoriaSlug: "smartphones_iphone",
      marca: "Apple",
      modeloCanonico,
      modeloReconhecido: true,
      condicao: "Seminovo",
      armazenamentoGb,
      ramGb: null,
      ramPossivelTypo: false,
      conectividade: null,
      nfc: false,
      tamanhoMm: null,
      gpsCellular: null,
      cor,
      corBase: cor,
      corEmojiOrigem: unidade.emoji,
      bateriaPct: unidade.bateria,
      cidade: null,
      garantia,
      quantidade: 1,
      tags: [...tagsBase],
      fornecedor: "realeza",
      tipoLista: "apple_seminovos",
      precoFornecedor: preco,
      linhaOrigem: linhaOriginal,
    };

    itens.push(item);
  }
}
