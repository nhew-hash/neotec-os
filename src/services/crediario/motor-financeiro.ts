/**
 * Motor financeiro único do Crediário — calcula plano de pagamento
 * pra qualquer frequência (diária/semanal/quinzenal/mensal). Nunca
 * divide "valor mensal" ingenuamente — sempre parte do VALOR
 * CONTRATADO (já com encargos aplicados) e distribui pelo número real
 * de pagamentos, com datas reais calculadas uma por uma.
 *
 * Pedido explícito do documento: um motor só, não quatro sistemas
 * diferentes por frequência.
 */

export type FrequenciaPagamento = "diaria" | "semanal" | "quinzenal" | "mensal";

const DIAS_POR_FREQUENCIA: Record<FrequenciaPagamento, number> = {
  diaria: 1, semanal: 7, quinzenal: 15, mensal: 30, // mensal usa "avança 1 mês" de verdade, não 30 dias fixos — ver função abaixo
};

/** Avança uma data pela frequência informada — mensal avança de mês corrido (nunca 30 dias fixos, senão desalinha o dia do vencimento ao longo do contrato). */
function avancarData(data: Date, frequencia: FrequenciaPagamento): Date {
  const nova = new Date(data);
  if (frequencia === "mensal") {
    nova.setMonth(nova.getMonth() + 1);
  } else {
    nova.setDate(nova.getDate() + DIAS_POR_FREQUENCIA[frequencia]);
  }
  return nova;
}

export interface ParcelaCalculada {
  numero: number;
  valor: number;
  vencimento: string; // YYYY-MM-DD
}

export interface PlanoCrediario {
  parcelas: ParcelaCalculada[];
  valorTotalContratado: number;
  primeiroVencimento: string;
  ultimoVencimento: string;
}

export interface CalcularPlanoInput {
  /** Valor líquido que a Neotec quer receber (custo do aparelho + margem), ANTES de qualquer encargo de parcelamento. */
  valorLiquidoDesejado: number;
  valorEntrada: number;
  frequencia: FrequenciaPagamento;
  numeroPagamentos: number;
  /** Encargo percentual da política/classe — aplicado sobre o saldo financiado, nunca sobre o valor já pago de entrada. */
  encargosPct: number;
  dataInicio: string; // YYYY-MM-DD
}

/**
 * Calcula o plano completo. A fórmula fica centralizada aqui —
 * qualquer ajuste futuro de "como calcular encargo" muda só nessa
 * função, nunca espalhado pela tela de oferta, pelo contrato ou pela
 * cobrança.
 */
export function calcularPlanoCrediario(input: CalcularPlanoInput): PlanoCrediario {
  if (input.numeroPagamentos <= 0) throw new Error("Número de pagamentos precisa ser maior que zero");

  const saldoAFinanciar = Math.max(0, input.valorLiquidoDesejado - input.valorEntrada);
  const valorComEncargos = saldoAFinanciar * (1 + input.encargosPct / 100);
  const valorPorParcela = Math.round((valorComEncargos / input.numeroPagamentos) * 100) / 100;

  const parcelas: ParcelaCalculada[] = [];
  let dataAtual = new Date(`${input.dataInicio}T12:00:00`); // meio-dia evita problema de fuso horário mudando o dia

  for (let i = 1; i <= input.numeroPagamentos; i++) {
    parcelas.push({ numero: i, valor: valorPorParcela, vencimento: dataAtual.toISOString().slice(0, 10) });
    dataAtual = avancarData(dataAtual, input.frequencia);
  }

  // Ajuste de centavos — a soma das parcelas arredondadas pode ficar
  // alguns centavos diferente do total exato; a diferença vai toda
  // pra ÚLTIMA parcela, nunca escondida ou distribuída de forma que
  // confunda o cliente.
  const somaParcelas = valorPorParcela * input.numeroPagamentos;
  const diferenca = Math.round((valorComEncargos - somaParcelas) * 100) / 100;
  if (diferenca !== 0 && parcelas.length > 0) {
    parcelas[parcelas.length - 1].valor = Math.round((parcelas[parcelas.length - 1].valor + diferenca) * 100) / 100;
  }

  return {
    parcelas,
    valorTotalContratado: input.valorEntrada + valorComEncargos,
    primeiroVencimento: parcelas[0]?.vencimento ?? input.dataInicio,
    ultimoVencimento: parcelas[parcelas.length - 1]?.vencimento ?? input.dataInicio,
  };
}

/** Número de pagamentos "padrão" sugerido por frequência, dado um prazo em meses — só um ponto de partida, o vendedor pode ajustar. */
export function sugerirNumeroPagamentos(prazoMeses: number, frequencia: FrequenciaPagamento): number {
  const diasTotais = prazoMeses * 30;
  if (frequencia === "mensal") return prazoMeses;
  return Math.round(diasTotais / DIAS_POR_FREQUENCIA[frequencia]);
}
