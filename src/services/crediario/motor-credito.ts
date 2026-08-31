import { createClient } from "@/lib/supabase/server";
import { calcularPlanoCrediario, sugerirNumeroPagamentos, type FrequenciaPagamento } from "./motor-financeiro";

/**
 * Score Neotec — combina histórico interno (pagamento na própria
 * Neotec) com o que vier do bureau (quando consultado), pesos
 * configuráveis via crediario_politicas. A restrição (negativado)
 * é UMA variável entre várias, nunca reprova sozinha (pedido
 * explícito da seção 8 do documento).
 */
export interface ScoreCalculado {
  scoreFinal: number;
  breakdown: Record<string, number>;
  possuiRestricaoBureau: boolean;
}

export async function calcularScoreNeotec(clienteId: string, possuiRestricaoBureau: boolean, scoreBureauBruto: number | null): Promise<ScoreCalculado> {
  const supabase = await createClient();

  const [{ data: politica }, { data: historico }] = await Promise.all([
    supabase.from("crediario_politicas").select("*").eq("id", "default").maybeSingle(),
    supabase.from("crediario_cliente_historico").select("*").eq("cliente_id", clienteId).maybeSingle(),
  ]);

  const pesoPagamentoNeotec = politica?.peso_score_pagamento_neotec ?? 40;
  const pesoBureau = politica?.peso_score_bureau ?? 30;
  const pesoEstabilidade = politica?.peso_score_estabilidade ?? 15;
  const pesoEntrada = politica?.peso_score_entrada ?? 15;

  const breakdown: Record<string, number> = {};

  // Histórico de pagamento Neotec — cliente novo (sem histórico) fica no meio da faixa, nem penalizado nem beneficiado.
  if (!historico || historico.contratos_concluidos + historico.contratos_ativos === 0) {
    breakdown.historico_pagamento_neotec = pesoPagamentoNeotec * 0.5;
  } else {
    const totalParcelas = historico.parcelas_pagas + historico.parcelas_atrasadas;
    const taxaPontualidade = totalParcelas > 0 ? historico.parcelas_pagas / totalParcelas : 0.5;
    breakdown.historico_pagamento_neotec = Math.round(pesoPagamentoNeotec * taxaPontualidade);
  }

  // Bureau — só entra se foi consultado de verdade; sem consulta, fica neutro (metade do peso), nunca penaliza por falta de dado.
  if (scoreBureauBruto != null) {
    breakdown.bureau = Math.round(pesoBureau * (scoreBureauBruto / 1000)); // score de bureau tipicamente 0-1000, normaliza pra escala do peso
  } else {
    breakdown.bureau = Math.round(pesoBureau * 0.5);
  }

  // Estabilidade — dado simples (tempo de trabalho), cliente sem info cai no meio.
  breakdown.estabilidade = Math.round(pesoEstabilidade * 0.5);

  // Entrada — calculado depois, na hora da oferta (não dá pra saber aqui, sem valor de aparelho ainda) — fica neutro nessa etapa.
  breakdown.entrada = Math.round(pesoEntrada * 0.5);

  const scoreFinal = Math.max(0, Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0)));

  return { scoreFinal, breakdown, possuiRestricaoBureau };
}

export interface ClasseCredito {
  id: string;
  nome: string;
  score_minimo: number;
  score_maximo: number;
  limite_maximo: number;
  entrada_minima_pct: number;
  prazo_maximo_meses: number;
  encargos_pct: number;
  fiador_obrigatorio: boolean;
  valor_maximo_exposicao: number | null;
  frequencias_permitidas: string[];
}

export async function classificarPorScore(score: number): Promise<ClasseCredito | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_classes").select("*").eq("ativa", true).lte("score_minimo", score).gte("score_maximo", score).order("ordem").limit(1).maybeSingle();
  return data ?? null;
}

export interface OfertaCalculada {
  produtoId: string;
  produtoNome: string;
  frequencia: FrequenciaPagamento;
  valorEntrada: number;
  numeroPagamentos: number;
  valorPagamento: number;
  valorTotalContratado: number;
  status: "aprovado" | "entrada_maior" | "nao_disponivel";
  motivoIndisponivel: string | null;
}

/**
 * Motor de ofertas — pra cada aparelho elegível, calcula se cabe no
 * limite/exposição da classe do cliente. O vendedor nunca faz conta
 * manual (pedido explícito da seção 11 do documento).
 */
export async function calcularOfertasDisponiveis(input: {
  classe: ClasseCredito; entradaDisponivel: number; frequencia: FrequenciaPagamento; possuiRestricao: boolean; exigeFiadorPorRestricao: boolean;
}): Promise<OfertaCalculada[]> {
  const supabase = await createClient();
  const { data: aparelhosConfig } = await supabase
    .from("crediario_aparelhos_config")
    .select("*, produto:produtos(nome)")
    .eq("ativo", true);

  const ofertas: OfertaCalculada[] = [];

  for (const config of aparelhosConfig ?? []) {
    const produtoNome = (config.produto as unknown as { nome: string } | null)?.nome ?? "Aparelho";

    if (!input.classe.frequencias_permitidas.includes(input.frequencia)) {
      ofertas.push({ produtoId: config.produto_id, produtoNome, frequencia: input.frequencia, valorEntrada: 0, numeroPagamentos: 0, valorPagamento: 0, valorTotalContratado: 0, status: "nao_disponivel", motivoIndisponivel: `Frequência não permitida pra classe ${input.classe.nome}` });
      continue;
    }

    if (config.valor_referencia > input.classe.limite_maximo) {
      ofertas.push({ produtoId: config.produto_id, produtoNome, frequencia: input.frequencia, valorEntrada: 0, numeroPagamentos: 0, valorPagamento: 0, valorTotalContratado: 0, status: "nao_disponivel", motivoIndisponivel: "Valor acima do limite recomendado" });
      continue;
    }

    const entradaMinimaBase = Math.max(config.entrada_minima, config.valor_referencia * (input.classe.entrada_minima_pct / 100));
    // Cliente com restrição — entrada extra, pedido explícito da seção 8 (nunca reprova só por causa da restrição, mas ajusta a condição).
    const entradaMinima = input.possuiRestricao ? entradaMinimaBase * 1.15 : entradaMinimaBase;

    if (input.entradaDisponivel < entradaMinima) {
      ofertas.push({
        produtoId: config.produto_id, produtoNome, frequencia: input.frequencia,
        valorEntrada: entradaMinima, numeroPagamentos: 0, valorPagamento: 0, valorTotalContratado: 0,
        status: "entrada_maior", motivoIndisponivel: null,
      });
      continue;
    }

    const prazoMeses = Math.min(input.classe.prazo_maximo_meses, config.prazo_maximo_meses);
    const numeroPagamentos = sugerirNumeroPagamentos(prazoMeses, input.frequencia);

    const plano = calcularPlanoCrediario({
      valorLiquidoDesejado: config.valor_referencia, valorEntrada: input.entradaDisponivel,
      frequencia: input.frequencia, numeroPagamentos, encargosPct: input.classe.encargos_pct,
      dataInicio: new Date().toISOString().slice(0, 10),
    });

    ofertas.push({
      produtoId: config.produto_id, produtoNome, frequencia: input.frequencia,
      valorEntrada: input.entradaDisponivel, numeroPagamentos,
      valorPagamento: plano.parcelas[0]?.valor ?? 0, valorTotalContratado: plano.valorTotalContratado,
      status: "aprovado", motivoIndisponivel: null,
    });
  }

  return ofertas;
}

export interface ExposicaoCapital {
  custoAparelho: number;
  entrada: number;
  capitalRecuperado: number;
  capitalExposto: number;
}

export function calcularExposicaoCapital(custoAparelho: number, entrada: number): ExposicaoCapital {
  return { custoAparelho, entrada, capitalRecuperado: entrada, capitalExposto: Math.max(0, custoAparelho - entrada) };
}
