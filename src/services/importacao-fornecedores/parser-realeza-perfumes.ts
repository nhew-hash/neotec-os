import { parsePreco } from "./normalizacao";
import type { ItemDescartado, ItemExtraido, ResultadoParser } from "./tipos";

/**
 * Parser determinístico pra Realeza · Perfumes árabes (fixture 5).
 * Formato: "<quantidade> <NOME DO PERFUME> <preço>✅". Sem cor (não se
 * aplica a perfume). "KIT"/"PCS" → subcategoria Kits de perfume.
 *
 * Ambiguidade (regra 5 da spec): quando o MESMO nome aparece com preços
 * DIFERENTES sem nenhuma outra info que diferencie — descarta os dois e
 * registra. É feito em duas passadas: primeiro extrai tudo, depois
 * agrupa por nome pra achar duplicatas com preço diferente.
 */
export function parseRealezaPerfumes(textoOriginal: string): ResultadoParser {
  const linhas = textoOriginal.split("\n").map((l) => l.trim());
  const brutos: { nome: string; quantidade: number; preco: number; linhaOrigem: string }[] = [];

  for (const linha of linhas) {
    if (linha.length === 0) continue;
    if (/perfumes?\s*árabes?/i.test(linha)) continue; // cabeçalho "(PERFUMES ÁRABES)"
    if (!/^\d/.test(linha)) continue; // toda linha de produto começa com a quantidade

    // "3 KIT THE KINGDOM MASC 3PCS 210 ✅" -> quantidade=3, nome="KIT THE KINGDOM MASC 3PCS", preço=210
    const match = linha.match(/^(\d+)\s+(.+?)\s+(\d[\d.,]*)\s*✅?\s*$/);
    if (!match) continue;

    const quantidade = Number(match[1]);
    const nome = match[2].trim();
    const preco = parsePreco(match[3]);
    if (preco === null) continue;

    brutos.push({ nome, quantidade, preco, linhaOrigem: linha });
  }

  // Agrupa por nome normalizado pra detectar ambiguidade (mesmo nome, preços diferentes).
  const porNome = new Map<string, typeof brutos>();
  for (const item of brutos) {
    const chave = item.nome.toUpperCase().trim();
    const lista = porNome.get(chave) ?? [];
    lista.push(item);
    porNome.set(chave, lista);
  }

  const itens: ItemExtraido[] = [];
  const descartados: ItemDescartado[] = [];

  for (const [, ocorrencias] of porNome) {
    const precosUnicos = new Set(ocorrencias.map((o) => o.preco));
    if (precosUnicos.size > 1) {
      // Ambíguo: mesmo nome, preços diferentes, nenhuma outra info que distinga.
      for (const o of ocorrencias) {
        descartados.push({
          linhaOrigem: o.linhaOrigem,
          descricao: `${o.nome} (${o.preco})`,
          motivo: "ambiguo",
          detalhe: [...precosUnicos].join(" vs "),
        });
      }
      continue;
    }

    for (const o of ocorrencias) {
      const ehKit = /\bkit\b/i.test(o.nome) || /\bpcs\b/i.test(o.nome);
      itens.push({
        categoriaSlug: ehKit ? "perfumaria_kits" : "perfumaria_perfumes_arabes",
        marca: "Não informada",
        modeloCanonico: o.nome,
        modeloReconhecido: true,
        condicao: null,
        armazenamentoGb: null,
        ramGb: null,
        ramPossivelTypo: false,
        conectividade: null,
        nfc: false,
        tamanhoMm: null,
        gpsCellular: null,
        cor: "Não se aplica",
        corBase: "Não se aplica",
        corEmojiOrigem: null,
        bateriaPct: null,
        cidade: null,
        garantia: null,
        quantidade: o.quantidade,
        tags: [],
        fornecedor: "realeza",
        tipoLista: "perfumes",
        precoFornecedor: o.preco,
        linhaOrigem: o.linhaOrigem,
      });
    }
  }

  return { itens, descartados };
}
