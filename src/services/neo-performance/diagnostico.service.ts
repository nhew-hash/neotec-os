import { createClient } from "@/lib/supabase/server";
import type { PerformanceDiagnostico, TipoDiagnosticoPerformance, SeveridadeDiagnostico } from "@/types";

const VOLUME_MINIMO_COMPRAS = 5; // abaixo disso, não há dado suficiente pra classificar campanha como eficiente ou não
const PERIODO_FADIGA_DIAS = 3;

async function criarDiagnostico(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { campanha_id: string | null; tipo: TipoDiagnosticoPerformance; severidade: SeveridadeDiagnostico; mensagem: string; dados: Record<string, unknown> }
): Promise<void> {
  // Não duplica um diagnóstico do mesmo tipo/campanha que já está aberto — evita empilhar o mesmo alerta a cada execução.
  let consultaExistente = supabase.from("performance_diagnosticos").select("id").eq("tipo", input.tipo).eq("status", "aberto");
  consultaExistente = input.campanha_id ? consultaExistente.eq("campanha_id", input.campanha_id) : consultaExistente.is("campanha_id", null);
  const { data: existente } = await consultaExistente.maybeSingle();
  if (existente) return;

  const { error } = await supabase.from("performance_diagnosticos").insert(input);
  if (error) console.error(`Falha ao registrar diagnóstico (${input.tipo}):`, error.message);
}

/**
 * Primeiro cérebro analítico (Seção 11) — regras determinísticas, NUNCA
 * uma decisão baseada numa métrica isolada (regra 61). Roda sob demanda
 * (botão "Rodar diagnóstico" na tela, ou futuramente um cron — Fase 3 é
 * quem decide agir sozinho a partir disso; aqui só sinaliza).
 */
export async function rodarDiagnostico(): Promise<{ gerados: number }> {
  const supabase = await createClient();
  let gerados = 0;

  const { data: config } = await supabase.from("neo_performance_config").select("cac_maximo, margem_minima_pct, roas_minimo").maybeSingle();
  const cacMaximo = config?.cac_maximo ?? null;
  const margemMinimaPct = config?.margem_minima_pct ?? null;

  const { data: campanhas } = await supabase.from("ads_campanhas").select("id, nome");

  for (const campanha of campanhas ?? []) {
    const { data: metricas } = await supabase
      .from("ads_metricas_diarias")
      .select("data, gasto, compras, frequencia, ctr, leads")
      .eq("campanha_id", campanha.id)
      .order("data", { ascending: false })
      .limit(PERIODO_FADIGA_DIAS * 2);

    if (!metricas || metricas.length === 0) continue;

    const recentes = metricas.slice(0, PERIODO_FADIGA_DIAS);
    const anteriores = metricas.slice(PERIODO_FADIGA_DIAS, PERIODO_FADIGA_DIAS * 2);

    const gastoRecente = recentes.reduce((a, m) => a + Number(m.gasto), 0);
    const comprasRecente = recentes.reduce((a, m) => a + Number(m.compras), 0);
    const cacRecente = comprasRecente > 0 ? gastoRecente / comprasRecente : null;

    // --- CAC elevado (dados suficientes de compra, por período mínimo) ---
    if (cacMaximo != null && cacRecente != null && cacRecente > cacMaximo && recentes.length >= PERIODO_FADIGA_DIAS) {
      await criarDiagnostico(supabase, {
        campanha_id: campanha.id,
        tipo: "cac_elevado",
        severidade: cacRecente > cacMaximo * 1.5 ? "critico" : "atencao",
        mensagem: `CAC de ${campanha.nome} está em R$ ${cacRecente.toFixed(2)}, acima do máximo configurado (R$ ${cacMaximo.toFixed(2)}) nos últimos ${PERIODO_FADIGA_DIAS} dias.`,
        dados: { cac_recente: cacRecente, cac_maximo: cacMaximo, periodo_dias: PERIODO_FADIGA_DIAS },
      });
      gerados++;
    }

    // --- Criativo em fadiga: frequência sobe + CTR cai + custo aumenta ---
    if (anteriores.length >= PERIODO_FADIGA_DIAS) {
      const freqRecente = media(recentes.map((m) => m.frequencia));
      const freqAnterior = media(anteriores.map((m) => m.frequencia));
      const ctrRecente = media(recentes.map((m) => m.ctr));
      const ctrAnterior = media(anteriores.map((m) => m.ctr));
      const custoAnterior = anteriores.reduce((a, m) => a + Number(m.gasto), 0);

      const frequenciaSubiu = freqRecente != null && freqAnterior != null && freqRecente > freqAnterior;
      const ctrCaiu = ctrRecente != null && ctrAnterior != null && ctrRecente < ctrAnterior;
      const custoSubiu = custoAnterior > 0 && gastoRecente > custoAnterior;

      if (frequenciaSubiu && ctrCaiu && custoSubiu) {
        await criarDiagnostico(supabase, {
          campanha_id: campanha.id,
          tipo: "criativo_fadiga",
          severidade: "atencao",
          mensagem: `Possível fadiga de criativo em ${campanha.nome}: frequência subiu, CTR caiu e custo aumentou nos últimos ${PERIODO_FADIGA_DIAS} dias.`,
          dados: { frequencia_recente: freqRecente, frequencia_anterior: freqAnterior, ctr_recente: ctrRecente, ctr_anterior: ctrAnterior },
        });
        gerados++;
      }
    }

    // --- Campanha eficiente: CAC dentro da meta + volume mínimo + dados suficientes ---
    if (cacMaximo != null && cacRecente != null && cacRecente <= cacMaximo && comprasRecente >= VOLUME_MINIMO_COMPRAS) {
      await criarDiagnostico(supabase, {
        campanha_id: campanha.id,
        tipo: "campanha_eficiente",
        severidade: "info",
        mensagem: `${campanha.nome} está com CAC dentro da meta (R$ ${cacRecente.toFixed(2)}) e volume suficiente (${comprasRecente} compras) — candidata a escala.`,
        dados: { cac_recente: cacRecente, compras: comprasRecente },
      });
      gerados++;
    }
  }

  // --- Conversas sem vendas (visão geral, não por campanha) ---
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const [{ count: conversasMes }, { count: vendasMes }] = await Promise.all([
    supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("vendas").select("*", { count: "exact", head: true }).eq("status", "concluida").gte("data_venda", trintaDiasAtras.toISOString()),
  ]);
  if ((conversasMes ?? 0) >= 20 && (vendasMes ?? 0) / Math.max(conversasMes ?? 1, 1) < 0.05) {
    await criarDiagnostico(supabase, {
      campanha_id: null,
      tipo: "conversas_sem_venda",
      severidade: "atencao",
      mensagem: `${conversasMes} conversas nos últimos 30 dias geraram apenas ${vendasMes} vendas — taxa de conversão abaixo de 5%. Vale investigar atendimento/oferta.`,
      dados: { conversas: conversasMes, vendas: vendasMes },
    });
    gerados++;
  }

  // --- Venda sem margem ---
  if (margemMinimaPct != null) {
    const { data: vendasRecentes } = await supabase
      .from("vendas")
      .select("id, valor_total, lucro")
      .eq("status", "concluida")
      .gte("data_venda", trintaDiasAtras.toISOString());

    for (const venda of vendasRecentes ?? []) {
      if (venda.lucro == null || Number(venda.valor_total) === 0) continue;
      const margemPct = (Number(venda.lucro) / Number(venda.valor_total)) * 100;
      if (margemPct < margemMinimaPct) {
        await criarDiagnostico(supabase, {
          campanha_id: null,
          tipo: "venda_sem_margem",
          severidade: margemPct < 0 ? "critico" : "atencao",
          mensagem: `Venda ${venda.id} fechou com margem de ${margemPct.toFixed(1)}%, abaixo do mínimo configurado (${margemMinimaPct}%).`,
          dados: { venda_id: venda.id, margem_pct: margemPct, margem_minima_pct: margemMinimaPct },
        });
        gerados++;
      }
    }
  }

  return { gerados };
}

function media(valores: (number | null)[]): number | null {
  const validos = valores.filter((v): v is number => v != null);
  if (validos.length === 0) return null;
  return validos.reduce((a, v) => a + v, 0) / validos.length;
}

export async function listarDiagnosticos(status: "aberto" | "resolvido" | "ignorado" = "aberto"): Promise<PerformanceDiagnostico[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("performance_diagnosticos").select("*").eq("status", status).order("criado_em", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os diagnósticos: ${error.message}`);
  return data ?? [];
}

export async function resolverDiagnostico(id: string, status: "resolvido" | "ignorado"): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("performance_diagnosticos").update({ status, resolvido_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o diagnóstico: ${error.message}`);
}
