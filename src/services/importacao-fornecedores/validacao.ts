import type { ItemDescartado, ItemExtraido, ResultadoParser } from "./tipos";

/**
 * Segunda camada de validação, EM CÓDIGO, aplicada depois de qualquer
 * parser/extração (determinístico ou, futuramente, via IA) — conforme a
 * spec: "validação em código (preço > 0, faixa plausível por categoria,
 * bateria ≥ 80, sem CPO, sem comentário, sem ambiguidade, emoji de cor
 * conhecido)". Os parsers determinísticos já aplicam a maior parte disso
 * inline (é mais preciso fazer na hora, com o contexto da linha), então
 * esta camada funciona como uma rede de segurança final — principalmente
 * pra: preço/faixa, bateria (defesa em profundidade) e ambiguidade
 * genérica entre itens do mesmo lote que os parsers não veem juntos.
 */

/** Faixas de preço plausíveis por categoria (R$) — sinaliza fora da faixa, não descarta sozinho. */
// Slugs alinhados com a árvore de categorias semeada em
// `fase230_importacao_fornecedores_whatsapp.sql` (tabela `import_categorias`).
const FAIXA_PRECO_POR_CATEGORIA: Record<string, { min: number; max: number }> = {
  smartphones_iphone: { min: 300, max: 20000 },
  smartphones_samsung: { min: 200, max: 15000 },
  smartphones_xiaomi: { min: 100, max: 6000 },
  smartphones_outras_marcas: { min: 50, max: 5000 },
  tablets_ipad: { min: 300, max: 15000 },
  tablets_android: { min: 100, max: 6000 },
  tablets_infantil: { min: 50, max: 1500 },
  computadores_macbook: { min: 1000, max: 30000 },
  smartwatches_apple_watch: { min: 300, max: 10000 },
  acessorios_apple: { min: 30, max: 3000 },
  audio_fones: { min: 20, max: 3000 },
  audio_caixas_de_som: { min: 50, max: 5000 },
  audio_microfones: { min: 50, max: 5000 },
  casa_inteligente_robos_aspiradores: { min: 200, max: 10000 },
  mobilidade_triciclos_patinetes: { min: 200, max: 10000 },
  perfumaria_perfumes_arabes: { min: 20, max: 500 },
  perfumaria_kits: { min: 50, max: 1000 },
};

export interface ItemFlagado extends ItemExtraido {
  flags: string[];
}

export interface ResultadoValidacao {
  itens: ItemFlagado[];
  descartados: ItemDescartado[];
}

/** Chave de identidade "grosseira" pra detectar ambiguidade — sem bateria/cidade,
 * que são justamente os campos que costumam DIFERENCIAR itens iguais. */
function chaveAmbiguidade(item: ItemExtraido): string {
  return [item.fornecedor, item.modeloCanonico, item.armazenamentoGb ?? "-", item.cor, item.condicao ?? "-"].join("|");
}

/** Chave completa (com bateria/cidade) — usada só pra confirmar que dois itens
 * do mesmo grupo realmente não têm nada que os distinga. */
function chaveCompleta(item: ItemExtraido): string {
  return `${chaveAmbiguidade(item)}|${item.bateriaPct ?? "-"}|${item.cidade ?? "-"}`;
}

export function validarItens(resultadoParser: ResultadoParser): ResultadoValidacao {
  const descartados: ItemDescartado[] = [...resultadoParser.descartados];
  const candidatos: ItemFlagado[] = [];

  for (const item of resultadoParser.itens) {
    const flags: string[] = [];

    // preço > 0
    if (!(item.precoFornecedor > 0)) {
      descartados.push({
        linhaOrigem: item.linhaOrigem,
        descricao: `${item.modeloCanonico} ${item.cor}`,
        motivo: "preco_invalido",
      });
      continue;
    }

    // faixa plausível por categoria (sinaliza, não descarta — pode ser produto legítimo fora da faixa "comum")
    const faixa = FAIXA_PRECO_POR_CATEGORIA[item.categoriaSlug];
    if (faixa && (item.precoFornecedor < faixa.min || item.precoFornecedor > faixa.max)) {
      flags.push(`preco_fora_da_faixa (${item.precoFornecedor})`);
    }

    // bateria (rede de segurança — os parsers já filtram isso, mas reforça)
    if (item.condicao === "Seminovo") {
      if (item.bateriaPct === null) {
        descartados.push({
          linhaOrigem: item.linhaOrigem,
          descricao: `${item.modeloCanonico} ${item.cor}`,
          motivo: "bateria_nao_informada",
        });
        continue;
      }
      if (item.bateriaPct < 80) {
        descartados.push({
          linhaOrigem: item.linhaOrigem,
          descricao: `${item.modeloCanonico} ${item.cor}`,
          motivo: "bateria_baixa",
          detalhe: `${item.bateriaPct}%`,
        });
        continue;
      }
    }

    // modelo não reconhecido → entra, mas sinalizado
    if (!item.modeloReconhecido) flags.push("modelo_nao_reconhecido");
    // RAM/armazenamento possivelmente digitado errado
    if (item.ramPossivelTypo) flags.push("armazenamento_possivel_typo");
    // cor não resolvida (nem emoji conhecido, nem texto)
    if (item.cor === "Não informada") flags.push("cor_nao_informada");

    candidatos.push({ ...item, flags });
  }

  // Ambiguidade genérica: mesma chave grosseira, preços diferentes, e as
  // ocorrências do grupo não se distinguem nem por bateria nem por cidade.
  const grupos = new Map<string, ItemFlagado[]>();
  for (const item of candidatos) {
    const chave = chaveAmbiguidade(item);
    const lista = grupos.get(chave) ?? [];
    lista.push(item);
    grupos.set(chave, lista);
  }

  const itensFinais: ItemFlagado[] = [];
  for (const [, itensDoGrupo] of grupos) {
    const precosUnicos = new Set(itensDoGrupo.map((i) => i.precoFornecedor));
    const chavesCompletasUnicas = new Set(itensDoGrupo.map(chaveCompleta));

    // só é ambíguo se há preços diferentes E as chaves completas (com bateria/cidade)
    // colidem — ou seja, nada mais os diferencia.
    if (precosUnicos.size > 1 && chavesCompletasUnicas.size < itensDoGrupo.length) {
      for (const item of itensDoGrupo) {
        descartados.push({
          linhaOrigem: item.linhaOrigem,
          descricao: `${item.modeloCanonico} ${item.cor}`,
          motivo: "ambiguo",
          detalhe: [...precosUnicos].join(" vs "),
        });
      }
      continue;
    }

    itensFinais.push(...itensDoGrupo);
  }

  return { itens: itensFinais, descartados };
}
