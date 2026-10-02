import { createClient } from "@/lib/supabase/server";
import type { AutomationRegra, SimulacaoResultado } from "@/types";

/**
 * Lê "reduzir/aumentar orçamento em N%" de uma descrição de ação em
 * texto livre e aplica sobre um gasto base. Extraída como função pura
 * (sem Supabase) especificamente pra ser testável sem mock de banco —
 * ver __tests__/simulation.test.ts.
 */
export function aplicarPercentualAcao(gastoBase: number, acaoDescricao: string): number {
  const match = acaoDescricao.match(/(reduzir|aumentar).*?(\d+)\s*%/i);
  if (!match) return gastoBase;
  const [, direcao, percentualStr] = match;
  const percentual = Number(percentualStr) / 100;
  return direcao.toLowerCase() === "reduzir" ? gastoBase * (1 - percentual) : gastoBase * (1 + percentual);
}

/**
 * Backtest (Seção 50): "se essa regra estivesse ativa nos últimos N dias,
 * o que teria acontecido?" — roda inteiramente sobre dado histórico real
 * de `ads_metricas_diarias`, sem depender de nenhuma API externa, e por
 * isso é uma das poucas partes da Fase 3 que funciona de ponta a ponta
 * nesta sessão. Nunca afirma que o resultado histórico garante resultado
 * futuro (regra explícita da Seção 50) — isso fica só na UI, como aviso.
 */
export async function backtestRegra(regra: Pick<AutomationRegra, "nome" | "condicoes" | "acao">, diasPeriodo = 30): Promise<SimulacaoResultado> {
  const supabase = await createClient();
  const desdeISO = (() => {
    const d = new Date();
    d.setDate(d.getDate() - diasPeriodo);
    return d.toISOString().slice(0, 10);
  })();

  const { data: campanhas } = await supabase.from("ads_campanhas").select("id, nome");
  const { data: metricas } = await supabase.from("ads_metricas_diarias").select("campanha_id, data, gasto, compras, leads, valor_conversao").gte("data", desdeISO);

  const campanhasAfetadas: SimulacaoResultado["campanhasAfetadas"] = [];

  for (const campanha of campanhas ?? []) {
    const doCampanha = (metricas ?? []).filter((m) => m.campanha_id === campanha.id);
    if (doCampanha.length === 0) continue;

    const gastoTotal = doCampanha.reduce((a, m) => a + Number(m.gasto), 0);
    const comprasTotal = doCampanha.reduce((a, m) => a + Number(m.compras), 0);
    const cac = comprasTotal > 0 ? gastoTotal / comprasTotal : null;
    const contexto: Record<string, number> = { cac: cac ?? 0, gasto: gastoTotal, vendas: comprasTotal, leads: doCampanha.reduce((a, m) => a + Number(m.leads), 0) };

    const condicoesAtendidas = regra.condicoes.every((c) => {
      const valor = contexto[c.campo];
      if (valor == null) return false;
      switch (c.operador) {
        case ">": return valor > c.valor;
        case "<": return valor < c.valor;
        case ">=": return valor >= c.valor;
        case "<=": return valor <= c.valor;
        case "==": return valor === c.valor;
      }
    });
    if (!condicoesAtendidas) continue;

    // Simula o efeito de uma ação do tipo "reduzir/aumentar orçamento em N%" quando reconhecível pelo nome; senão, só sinaliza que a regra teria disparado.
    const gastoSimulado = aplicarPercentualAcao(gastoTotal, regra.acao);

    campanhasAfetadas.push({ campanha_id: campanha.id, nome: campanha.nome, gastoAtual: gastoTotal, gastoSimulado, diferenca: gastoSimulado - gastoTotal });
  }

  return {
    regra: regra.nome,
    periodoDias: diasPeriodo,
    campanhasAfetadas,
    observacao: "Resultado histórico — não garante o que aconteceria se a regra estivesse ativa a partir de hoje (Seção 50).",
  };
}

/**
 * Simulation Mode (Seção 49): "se eu tivesse executado esta ação, o
 * orçamento teria mudado de X para Y" — mesma mecânica do backtest, mas
 * pra uma campanha específica e uma ação pontual, sem mexer na conta.
 */
export async function simularAcao(campanhaId: string, acaoDescricao: string): Promise<{ gastoAtual: number; gastoSimulado: number; diferenca: number }> {
  const supabase = await createClient();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  const { data: metricas } = await supabase
    .from("ads_metricas_diarias")
    .select("gasto")
    .eq("campanha_id", campanhaId)
    .gte("data", seteDiasAtras.toISOString().slice(0, 10));

  const gastoAtual = (metricas ?? []).reduce((a, m) => a + Number(m.gasto), 0);
  const gastoSimulado = aplicarPercentualAcao(gastoAtual, acaoDescricao);

  return { gastoAtual, gastoSimulado, diferenca: gastoSimulado - gastoAtual };
}
