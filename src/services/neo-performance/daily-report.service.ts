import { createClient } from "@/lib/supabase/server";
import type { DailyPerformanceReport } from "@/types";

/**
 * Daily Performance Report (Seção 30). Monta o relatório inteiramente a
 * partir de dado real já existente (ads_metricas_diarias, vendas,
 * performance_diagnosticos, performance_decisoes, test_lab_testes) — não
 * há geração por IA aqui, é agregação direta, pra nunca inventar número.
 */
export async function gerarRelatorioDiario(dataISO?: string): Promise<DailyPerformanceReport> {
  const supabase = await createClient();
  const data = dataISO ?? new Date().toISOString().slice(0, 10);

  const [{ data: metricas }, { data: vendasDia }, { data: diagnosticosAbertos }, { data: decisoesHoje }, { data: testesAtivos }] = await Promise.all([
    supabase.from("ads_metricas_diarias").select("gasto, leads, compras, valor_conversao").eq("data", data),
    supabase.from("vendas").select("valor_total, lucro").eq("status", "concluida").gte("data_venda", `${data}T00:00:00`).lt("data_venda", `${data}T23:59:59`),
    supabase.from("performance_diagnosticos").select("mensagem, tipo, severidade").eq("status", "aberto"),
    supabase.from("performance_decisoes").select("motivo, acao").gte("criado_em", `${data}T00:00:00`).not("acao", "is", null),
    supabase.from("test_lab_testes").select("hipotese, status").eq("status", "rodando"),
  ]);

  const investimento = (metricas ?? []).reduce((a, m) => a + Number(m.gasto), 0);
  const leads = (metricas ?? []).reduce((a, m) => a + Number(m.leads), 0);
  const compras = (metricas ?? []).reduce((a, m) => a + Number(m.compras), 0);
  const valorConversao = (metricas ?? []).reduce((a, m) => a + Number(m.valor_conversao ?? 0), 0);

  const faturamento = (vendasDia ?? []).reduce((a, v) => a + Number(v.valor_total), 0);
  const margem = (vendasDia ?? []).reduce((a, v) => a + Number(v.lucro ?? 0), 0);
  const vendasCount = (vendasDia ?? []).length;

  const cac = vendasCount > 0 ? investimento / vendasCount : null;
  const roas = investimento > 0 ? valorConversao / investimento : null;

  const funcionando = (diagnosticosAbertos ?? []).filter((d) => d.tipo === "campanha_eficiente").map((d) => d.mensagem);
  const atencao = (diagnosticosAbertos ?? []).filter((d) => d.severidade === "atencao").map((d) => d.mensagem);
  const problemas = (diagnosticosAbertos ?? []).filter((d) => d.severidade === "critico").map((d) => d.mensagem);

  return {
    data,
    investimento,
    leads,
    vendas: vendasCount,
    faturamento,
    cac,
    roas,
    lucroAposAquisicao: margem - investimento,
    funcionando,
    atencao,
    problemas,
    acoesExecutadas: (decisoesHoje ?? []).map((d) => `${d.acao} — ${d.motivo}`),
    testesAtivos: (testesAtivos ?? []).map((t) => t.hipotese),
    proximasHipoteses: [], // alimentado manualmente pelo Test Lab (Seção 20) — sem geração automática de hipótese nesta fase
  };
}
