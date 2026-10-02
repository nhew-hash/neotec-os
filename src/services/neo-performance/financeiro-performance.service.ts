import { createClient } from "@/lib/supabase/server";
import type { ResumoNeoPerformance } from "@/types";

function inicioDoDia(d: Date): string {
  const data = new Date(d);
  data.setHours(0, 0, 0, 0);
  return data.toISOString();
}

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function somarGastoAds(supabase: Awaited<ReturnType<typeof createClient>>, desdeISO: string): Promise<number> {
  const { data, error } = await supabase.from("ads_metricas_diarias").select("gasto").gte("data", desdeISO.slice(0, 10));
  if (error) throw new Error(`Não foi possível somar o investimento em anúncios: ${error.message}`);
  return (data ?? []).reduce((acc, m) => acc + Number(m.gasto), 0);
}

/**
 * Agrega os números do Seção 1 (Dashboard principal). Reutiliza
 * `vendas.lucro`/`vendas.valor_total` (já calculados na venda — não
 * recalcula margem do zero, como manda a Regra Zero) e soma o
 * investimento vindo de `ads_metricas_diarias`.
 */
export async function obterResumoDashboard(): Promise<ResumoNeoPerformance> {
  const supabase = await createClient();

  const [
    investimentoHoje,
    investimentoSemana,
    investimentoMes,
    { data: config },
    { data: vendasMes },
    { count: leadsMes },
    { count: conversasMes },
  ] = await Promise.all([
    somarGastoAds(supabase, inicioDoDia(new Date())),
    somarGastoAds(supabase, diasAtras(7).toISOString()),
    somarGastoAds(supabase, diasAtras(30).toISOString()),
    supabase.from("neo_performance_config").select("limite_diario, limite_semanal, limite_mensal").maybeSingle(),
    supabase.from("vendas").select("valor_total, lucro, data_venda").eq("status", "concluida").gte("data_venda", diasAtras(30).toISOString()),
    supabase.from("crm_cards").select("*", { count: "exact", head: true }).gte("created_at", diasAtras(30).toISOString()),
    supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).gte("created_at", diasAtras(30).toISOString()),
  ]);

  const faturamento = (vendasMes ?? []).reduce((acc, v) => acc + Number(v.valor_total), 0);
  const margem = (vendasMes ?? []).reduce((acc, v) => acc + Number(v.lucro ?? 0), 0);
  const vendasCount = (vendasMes ?? []).length;
  const investimento30d = investimentoMes;

  const cac = vendasCount > 0 ? investimento30d / vendasCount : null;
  const roas = investimento30d > 0 ? faturamento / investimento30d : null;
  const lucroEstimado = margem - investimento30d;
  const taxaConversao = (leadsMes ?? 0) > 0 ? vendasCount / (leadsMes ?? 1) : null;
  const ticketMedio = vendasCount > 0 ? faturamento / vendasCount : null;

  return {
    investimento: { hoje: investimentoHoje, semana: investimentoSemana, mes: investimentoMes },
    limites: {
      diario: config?.limite_diario ?? null,
      semanal: config?.limite_semanal ?? null,
      mensal: config?.limite_mensal ?? null,
    },
    leads: leadsMes ?? 0,
    conversas: conversasMes ?? 0,
    vendas: vendasCount,
    faturamento,
    margem,
    cac,
    roas,
    lucroEstimado,
    taxaConversao,
    ticketMedio,
    comparacaoMesAnterior: null, // comparação mês-a-mês entra quando houver 2 meses completos de dado real de ads
  };
}

export interface DesempenhoCampanha {
  campanha_id: string;
  nome: string;
  gasto: number;
  leads: number;
  compras: number;
  cac: number | null;
  roas: number | null;
}

/** Desempenho por campanha — base do "qual campanha trouxe essas vendas" (Fase 1 — Resultado esperado). */
export async function obterDesempenhoPorCampanha(diasPeriodo = 30): Promise<DesempenhoCampanha[]> {
  const supabase = await createClient();
  const desdeISO = diasAtras(diasPeriodo).toISOString().slice(0, 10);

  const { data: campanhas, error: errCampanhas } = await supabase.from("ads_campanhas").select("id, nome");
  if (errCampanhas) throw new Error(`Não foi possível carregar as campanhas: ${errCampanhas.message}`);

  const { data: metricas, error: errMetricas } = await supabase
    .from("ads_metricas_diarias")
    .select("campanha_id, gasto, leads, compras, valor_conversao")
    .gte("data", desdeISO);
  if (errMetricas) throw new Error(`Não foi possível carregar as métricas: ${errMetricas.message}`);

  return (campanhas ?? []).map((c) => {
    const doCampanha = (metricas ?? []).filter((m) => m.campanha_id === c.id);
    const gasto = doCampanha.reduce((acc, m) => acc + Number(m.gasto), 0);
    const leads = doCampanha.reduce((acc, m) => acc + Number(m.leads), 0);
    const compras = doCampanha.reduce((acc, m) => acc + Number(m.compras), 0);
    const valorConversao = doCampanha.reduce((acc, m) => acc + Number(m.valor_conversao ?? 0), 0);
    return {
      campanha_id: c.id,
      nome: c.nome,
      gasto,
      leads,
      compras,
      cac: compras > 0 ? gasto / compras : null,
      roas: gasto > 0 ? valorConversao / gasto : null,
    };
  });
}
