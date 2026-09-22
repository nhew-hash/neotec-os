import type { PlanoAplicacao } from "./aplicacao-diff";
import type { ItemDescartado } from "./tipos";
import type { Fornecedor, TipoLista } from "./classificador";

const NOMES_TIPO_LISTA: Record<TipoLista, string> = {
  goat_completa: "Lista completa",
  apple_lacrados: "Apple lacrados",
  apple_seminovos: "Apple seminovos",
  android: "Android/tablets",
  perfumes: "Perfumes",
  audio_extras: "JBL/extras",
};

const NOMES_FORNECEDOR: Record<Fornecedor, string> = {
  goat: "Goat",
  realeza: "Realeza",
};

/**
 * Monta o resumo enviado de volta no WhatsApp depois de aplicar uma
 * lista — formato do exemplo da spec: "Realeza · Apple lacrados: 22
 * itens, 2 preços mudaram (MacBook Neo 4697→4650), 1 saiu (iPhone 17
 * Lavanda), 2 descartados (CPO)".
 */
export function montarResumoWhatsApp(
  fornecedor: Fornecedor,
  tipoLista: TipoLista,
  plano: PlanoAplicacao,
  descartados: ItemDescartado[]
): string {
  const totalAtivos = plano.inserir.length + plano.atualizarPreco.length + plano.semMudanca.length;
  const partes: string[] = [`${totalAtivos} ${totalAtivos === 1 ? "item" : "itens"}`];

  if (plano.atualizarPreco.length > 0) {
    const exemplo = plano.atualizarPreco[0];
    const sufixoExemplo = ` (${exemplo.item.modeloCanonico} ${exemplo.precoAntigo}→${exemplo.precoNovo})`;
    const verbo = plano.atualizarPreco.length > 1 ? "mudaram" : "mudou";
    partes.push(`${plano.atualizarPreco.length} preço${plano.atualizarPreco.length > 1 ? "s" : ""} ${verbo}${sufixoExemplo}`);
  }

  if (plano.inserir.length > 0) {
    partes.push(`${plano.inserir.length} ${plano.inserir.length > 1 ? "entraram" : "entrou"}`);
  }

  if (plano.desativar.length > 0) {
    const exemplo = plano.desativar[0];
    partes.push(`${plano.desativar.length} sa${plano.desativar.length > 1 ? "íram" : "iu"} (${exemplo.modeloCanonico} ${exemplo.cor})`);
  }

  if (descartados.length > 0) {
    const motivosContagem = new Map<string, number>();
    for (const d of descartados) {
      motivosContagem.set(d.motivo, (motivosContagem.get(d.motivo) ?? 0) + 1);
    }
    const resumoMotivos = [...motivosContagem.entries()]
      .map(([motivo, qtd]) => `${qtd} ${traduzirMotivo(motivo)}`)
      .join(", ");
    partes.push(`${descartados.length} descartado${descartados.length > 1 ? "s" : ""} (${resumoMotivos})`);
  }

  return `${NOMES_FORNECEDOR[fornecedor]} · ${NOMES_TIPO_LISTA[tipoLista]}: ${partes.join(", ")}`;
}

function traduzirMotivo(motivo: string): string {
  const mapa: Record<string, string> = {
    iphone_lacrado_goat: "iPhone lacrado da Goat",
    bateria_baixa: "bateria baixa",
    bateria_nao_informada: "bateria não informada",
    cpo: "CPO",
    comentario: "comentário",
    ambiguo: "ambíguo",
    preco_invalido: "preço inválido",
    emoji_cor_desconhecido: "cor desconhecida",
  };
  return mapa[motivo] ?? motivo;
}
