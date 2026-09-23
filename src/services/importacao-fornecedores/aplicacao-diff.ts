import type { ItemExtraido } from "./tipos";
import type { ItemFlagado } from "./validacao";

/**
 * Lógica PURA (sem banco) de diff/aplicação por escopo — a peça central
 * pra resolver o Risco 9 (múltiplos fornecedores de seminovo simultâneos
 * confirmado pelo usuário: "Tenho vários fornecedores de seminovo
 * simultâneos"): o escopo de substituição é sempre `fornecedor +
 * tipo_lista`, NUNCA o conjunto inteiro de `aparelhos`/`produtos` como o
 * `central-fornecedor.actions.ts` atual faz hoje.
 *
 * O service que fala com o banco (a ser implementado numa próxima fase —
 * ver nota no relatório de entrega) deve:
 *   1. Buscar os itens ATIVOS atuais do escopo (fornecedor+tipo_lista).
 *   2. Chamar `calcularPlanoAplicacao(itensNovos, itensAtivosAnteriores)`.
 *   3. Chamar `avaliarTravasDeSeguranca(...)` — se bloquear, NÃO aplica,
 *      só guarda o plano numa fila de revisão e notifica o dono.
 *   4. Se liberado, aplicar o plano numa transação: inserir novos,
 *      atualizar preço (mantendo o id — "não quebra o link da loja"),
 *      desativar (nunca apagar) os que saíram, e salvar um snapshot do
 *      estado anterior pra permitir rollback de 1 clique.
 */

export interface ItemArmazenado extends ItemExtraido {
  id: string;
}

export interface PlanoAplicacao {
  inserir: ItemExtraido[];
  atualizarPreco: { id: string; item: ItemArmazenado; precoAntigo: number; precoNovo: number }[];
  desativar: ItemArmazenado[];
  semMudanca: ItemArmazenado[];
}

/**
 * Chave de identidade do item (spec): fornecedor + modelo_canonico +
 * especificação + cor + condição (+ bateria/cidade no seminovo, já que
 * são exatamente os campos que diferenciam duas unidades físicas iguais
 * mas com histórico de uso diferente).
 */
export function chaveIdentidade(item: ItemExtraido): string {
  const partes = [
    item.fornecedor,
    item.modeloCanonico,
    item.armazenamentoGb ?? "-",
    item.ramGb ?? "-",
    item.conectividade ?? "-",
    item.nfc ? "nfc" : "-",
    item.tamanhoMm ?? "-",
    item.gpsCellular ?? "-",
    item.cor,
    item.condicao ?? "-",
  ];
  if (item.condicao === "Seminovo") {
    partes.push(item.bateriaPct ?? "-", item.cidade ?? "-");
  }
  return partes.join("|");
}

/**
 * Calcula o plano de aplicação comparando os itens recém-extraídos
 * (já validados) com os itens ATIVOS anteriores do MESMO escopo
 * (fornecedor + tipo_lista) — o chamador é responsável por já ter
 * filtrado `itensAtivosAnteriores` pelo escopo certo.
 */
export function calcularPlanoAplicacao(itensNovos: ItemExtraido[], itensAtivosAnteriores: ItemArmazenado[]): PlanoAplicacao {
  const mapaAnteriores = new Map<string, ItemArmazenado>();
  for (const item of itensAtivosAnteriores) {
    mapaAnteriores.set(chaveIdentidade(item), item);
  }

  const inserir: ItemExtraido[] = [];
  const atualizarPreco: PlanoAplicacao["atualizarPreco"] = [];
  const semMudanca: ItemArmazenado[] = [];
  const chavesEncontradas = new Set<string>();

  for (const novo of itensNovos) {
    const chave = chaveIdentidade(novo);
    const antigo = mapaAnteriores.get(chave);
    if (!antigo) {
      inserir.push(novo);
      continue;
    }
    chavesEncontradas.add(chave);
    if (antigo.precoFornecedor !== novo.precoFornecedor) {
      atualizarPreco.push({ id: antigo.id, item: antigo, precoAntigo: antigo.precoFornecedor, precoNovo: novo.precoFornecedor });
    } else {
      semMudanca.push(antigo);
    }
  }

  const desativar = itensAtivosAnteriores.filter((antigo) => !chavesEncontradas.has(chaveIdentidade(antigo)));

  return { inserir, atualizarPreco, desativar, semMudanca };
}

export interface ResultadoTravas {
  /** Bloqueia a lista INTEIRA — só quando o problema é da lista como um todo (queda de volume, descartes, cor desconhecida), nunca por causa de 1 item isolado. */
  bloqueado: boolean;
  motivos: string[];
  /**
   * Atualizações de preço com variação absurda (>30%) — NÃO bloqueiam a
   * lista inteira (ver nota abaixo), ficam retidas pra revisão manual
   * enquanto o resto da lista aplica normalmente.
   */
  itensRetidos: PlanoAplicacao["atualizarPreco"];
  motivosRetencao: string[];
}

export interface OpcoesTravas {
  /** Itens novos ATIVOS/válidos (depois de validarItens) — usado pra comparar volume. */
  itensNovosValidos: (ItemExtraido | ItemFlagado)[];
  descartados: number;
  /** % mínimo de itens do lote anterior que precisa se manter (default 0.5 = 50%). */
  limiteQuedaVolume?: number;
  /** Variação máxima de preço aceitável numa atualização (default 0.3 = 30%). */
  limiteVariacaoPreco?: number;
}

/**
 * Travas de segurança (spec, item 5): lista nova com muito menos itens
 * que a anterior do mesmo escopo (<50%), muitos descartes, ou emoji de
 * cor desconhecido → sinal de que a lista INTEIRA veio malformada,
 * então bloqueia tudo.
 *
 * Variação de preço absurda (>30%) é diferente: é um problema de UM
 * item, não da lista toda. Bloquear a lista inteira por causa disso já
 * causou o bug relatado pelo dono (22/09/2026) — uma vez que um item
 * entra em variação permanente (ex: fornecedor corrigindo um preço
 * digitado errado antes, ou um erro de parsing isolado), a lista fica
 * bloqueada, o baseline nunca avança, e TODAS as listas seguintes do
 * mesmo fornecedor+tipo ficam bloqueadas também — mesmo as que não têm
 * nada de errado. Por isso agora só aquele item específico fica retido
 * pra revisão manual; o resto do plano aplica normalmente.
 */
export function avaliarTravasDeSeguranca(plano: PlanoAplicacao, itensAtivosAnteriores: ItemArmazenado[], opcoes: OpcoesTravas): ResultadoTravas {
  const motivos: string[] = [];
  const motivosRetencao: string[] = [];
  const itensRetidos: PlanoAplicacao["atualizarPreco"] = [];
  const limiteQueda = opcoes.limiteQuedaVolume ?? 0.5;
  const limiteVariacao = opcoes.limiteVariacaoPreco ?? 0.3;

  if (itensAtivosAnteriores.length > 0) {
    const proporcao = opcoes.itensNovosValidos.length / itensAtivosAnteriores.length;
    if (proporcao < limiteQueda) {
      motivos.push(
        `Lista nova tem só ${opcoes.itensNovosValidos.length} itens vs ${itensAtivosAnteriores.length} anteriores (${Math.round(proporcao * 100)}%, mínimo ${Math.round(limiteQueda * 100)}%).`
      );
    }
  }

  for (const upd of plano.atualizarPreco) {
    if (upd.precoAntigo <= 0) continue;
    const variacao = Math.abs(upd.precoNovo - upd.precoAntigo) / upd.precoAntigo;
    if (variacao > limiteVariacao) {
      itensRetidos.push(upd);
      motivosRetencao.push(
        `Variação de preço absurda em ${upd.item.modeloCanonico} ${upd.item.cor}: ${upd.precoAntigo} → ${upd.precoNovo} (${Math.round(variacao * 100)}%) — retido pra revisão manual, resto da lista aplicado.`
      );
    }
  }

  if (opcoes.descartados > opcoes.itensNovosValidos.length && opcoes.itensNovosValidos.length > 0) {
    motivos.push(`Muitos descartes (${opcoes.descartados}) em relação aos itens aceitos (${opcoes.itensNovosValidos.length}).`);
  }

  const comCorDesconhecida = opcoes.itensNovosValidos.filter(
    (i): i is ItemFlagado => "flags" in i && i.flags.includes("cor_nao_informada")
  );
  if (comCorDesconhecida.length > 0) {
    motivos.push(`${comCorDesconhecida.length} item(ns) com cor não identificada (emoji desconhecido ou sem cor escrita).`);
  }

  return { bloqueado: motivos.length > 0, motivos, itensRetidos, motivosRetencao };
}
