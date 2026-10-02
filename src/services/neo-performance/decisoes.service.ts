import { createClient } from "@/lib/supabase/server";
import type { PerformanceDecisao, StatusDecisaoPerformance } from "@/types";

/**
 * Centro de Decisões da IA (Seção 10) + auditoria completa (Seção 26).
 * Nenhuma decisão passa daqui sem rastro — e, como não existe (ainda)
 * escrita real na API do Meta/Google Ads (ver automation-engine.service.ts),
 * `status` NUNCA chega como "executado" por conta própria: fica
 * "registrado" (decisão manual, sem ação) ou "aguardando_avaliacao"
 * (uma ação foi PROPOSTA pela regra/agente, mas a mudança real na
 * plataforma de anúncios depende de alguém aplicar fora do sistema, ou
 * da write-API que ainda não existe). Isso é o que impede a Fase 3 de
 * fingir uma automação que não roda de fato (Seção 57).
 */
export async function registrarDecisao(input: {
  campanha_id?: string;
  agente?: string;
  tipo_decisao: string;
  motivo: string;
  dados_utilizados?: Record<string, unknown>;
  acao?: string;
  resultado_esperado?: string;
  executado_por?: string;
  valor_anterior?: Record<string, unknown>;
  valor_novo?: Record<string, unknown>;
}): Promise<PerformanceDecisao> {
  const supabase = await createClient();
  const { data: config } = await supabase.from("neo_performance_config").select("modo_autonomia").maybeSingle();
  const status: StatusDecisaoPerformance = input.acao ? "aguardando_avaliacao" : "registrado";

  const { data, error } = await supabase
    .from("performance_decisoes")
    .insert({
      campanha_id: input.campanha_id ?? null,
      agente: input.agente ?? "manual",
      tipo_decisao: input.tipo_decisao,
      motivo: input.motivo,
      dados_utilizados: input.dados_utilizados ?? {},
      acao: input.acao ?? null,
      resultado_esperado: input.resultado_esperado ?? null,
      status,
      executado_por: input.executado_por ?? null,
      valor_anterior: input.valor_anterior ?? null,
      valor_novo: input.valor_novo ?? null,
      modo_autonomia_no_momento: config?.modo_autonomia ?? "observacao",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível registrar a decisão: ${error.message}`);
  return data;
}

export async function listarDecisoes(campanhaId?: string): Promise<PerformanceDecisao[]> {
  const supabase = await createClient();
  let query = supabase.from("performance_decisoes").select("*").order("criado_em", { ascending: false });
  if (campanhaId) query = query.eq("campanha_id", campanhaId);
  const { data, error } = await query.limit(100);
  if (error) throw new Error(`Não foi possível carregar as decisões: ${error.message}`);
  return data ?? [];
}

export async function avaliarDecisao(id: string, resultadoPosterior: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("performance_decisoes").update({ resultado_posterior: resultadoPosterior, status: "avaliado" }).eq("id", id);
  if (error) throw new Error(`Não foi possível avaliar a decisão: ${error.message}`);
}
