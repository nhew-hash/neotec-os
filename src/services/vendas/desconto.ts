/**
 * Regra de desconto do PDV (Fase B). Funções puras e a tradução dos erros da
 * função SQL `registrar_venda_pdv` em códigos que a tela entende.
 * A decisão FINAL é sempre do banco; isto só espelha a regra para a tela
 * avisar antes de tentar finalizar.
 */

export function calcularPercentualDesconto(valorBruto: number, desconto: number): number {
  if (!(valorBruto > 0) || !(desconto > 0)) return 0;
  return Math.round((desconto / valorBruto) * 10000) / 100;
}

export interface RegraDescontoLoja {
  regraAtiva: boolean;
  /** cargo -> % máximo. Cargo ausente = 0% (qualquer desconto exige aprovação). */
  limitesPorCargo: Record<string, number>;
}

export type AvaliacaoDesconto =
  | { situacao: "livre" }
  | { situacao: "dentro_do_limite"; limite: number }
  | { situacao: "requer_aprovacao"; limite: number; percentual: number }
  | { situacao: "invalido"; motivo: string };

export function avaliarDesconto(params: { cargo: string; valorBruto: number; desconto: number; regra: RegraDescontoLoja }): AvaliacaoDesconto {
  const { cargo, valorBruto, desconto, regra } = params;
  if (desconto < 0 || Number.isNaN(desconto)) return { situacao: "invalido", motivo: "Desconto inválido." };
  if (desconto > valorBruto) return { situacao: "invalido", motivo: "O desconto não pode ser maior que o valor dos itens." };
  if (!regra.regraAtiva || cargo === "admin" || desconto === 0) return { situacao: "livre" };
  const limite = regra.limitesPorCargo[cargo] ?? 0;
  const percentual = calcularPercentualDesconto(valorBruto, desconto);
  return percentual > limite ? { situacao: "requer_aprovacao", limite, percentual } : { situacao: "dentro_do_limite", limite };
}

export type CodigoErroVenda =
  | "SESSAO_EXPIRADA" | "VENDA_SEM_ITENS" | "VALOR_INVALIDO" | "DESCONTO_INVALIDO" | "DESCONTO_REQUER_APROVACAO"
  | "APROVACAO_INVALIDA" | "TRADE_IN_INEXISTENTE" | "TRADE_IN_NAO_APROVADO" | "TRADE_IN_OUTRO_CLIENTE"
  | "CASHBACK_SEM_CLIENTE" | "CASHBACK_INSUFICIENTE" | "APARELHO_INDISPONIVEL" | "SALDO_INSUFICIENTE" | "PAGAMENTO_DIVERGENTE";

const CODIGOS: CodigoErroVenda[] = [
  "SESSAO_EXPIRADA", "VENDA_SEM_ITENS", "VALOR_INVALIDO", "DESCONTO_INVALIDO", "DESCONTO_REQUER_APROVACAO", "APROVACAO_INVALIDA",
  "TRADE_IN_INEXISTENTE", "TRADE_IN_NAO_APROVADO", "TRADE_IN_OUTRO_CLIENTE", "CASHBACK_SEM_CLIENTE", "CASHBACK_INSUFICIENTE",
  "APARELHO_INDISPONIVEL", "SALDO_INSUFICIENTE", "PAGAMENTO_DIVERGENTE",
];

/** Extrai "CODIGO: mensagem" das exceções da função SQL. Mensagem desconhecida volta com código null. */
export function interpretarErroVenda(mensagem: string): { codigo: CodigoErroVenda | null; texto: string } {
  for (const codigo of CODIGOS) {
    const i = mensagem.indexOf(`${codigo}:`);
    if (i >= 0) return { codigo, texto: mensagem.slice(i + codigo.length + 1).trim() };
  }
  return { codigo: null, texto: mensagem };
}

export class ErroVendaPDV extends Error {
  constructor(public codigo: CodigoErroVenda | null, mensagem: string) {
    super(mensagem);
    this.name = "ErroVendaPDV";
  }
}
