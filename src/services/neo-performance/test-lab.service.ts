import { createClient } from "@/lib/supabase/server";
import type { TestLabTeste } from "@/types";

export async function listarTestes(): Promise<TestLabTeste[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_lab_testes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os testes: ${error.message}`);
  return data ?? [];
}

export async function criarTeste(input: {
  hipotese: string;
  variavel: string;
  controle: string;
  metrica_principal: string;
  metricas_secundarias?: string[];
  duracao_minima_dias?: number;
  amostra_minima?: number;
  brief_id?: string;
  campanha_id?: string;
}): Promise<TestLabTeste> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("test_lab_testes")
    .insert({
      hipotese: input.hipotese,
      variavel: input.variavel,
      controle: input.controle,
      metrica_principal: input.metrica_principal,
      metricas_secundarias: input.metricas_secundarias ?? [],
      duracao_minima_dias: input.duracao_minima_dias ?? 7,
      amostra_minima: input.amostra_minima ?? 30,
      brief_id: input.brief_id ?? null,
      campanha_id: input.campanha_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar o teste: ${error.message}`);
  return data;
}

export async function iniciarTeste(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("test_lab_testes").update({ status: "rodando", iniciado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Não foi possível iniciar o teste: ${error.message}`);
}

/**
 * Avalia um teste em andamento (Seção 21 — "não declarar vencedor cedo
 * demais"). Só declara resultado quando duração mínima E amostra mínima
 * foram atingidas; antes disso, marca `dados_insuficientes` e devolve
 * "continuar coleta", nunca uma conclusão apressada.
 */
export async function avaliarTeste(id: string): Promise<TestLabTeste> {
  const supabase = await createClient();
  const { data: teste } = await supabase.from("test_lab_testes").select("*").eq("id", id).single();
  if (!teste) throw new Error("Teste não encontrado");
  if (!teste.campanha_id || !teste.iniciado_em) {
    throw new Error("Teste sem campanha vinculada ou não iniciado — não há dado real pra avaliar.");
  }

  const diasRodando = Math.floor((Date.now() - new Date(teste.iniciado_em).getTime()) / (1000 * 60 * 60 * 24));

  const { obterDesempenhoPorCampanha } = await import("./financeiro-performance.service");
  const desempenho = await obterDesempenhoPorCampanha(Math.max(diasRodando, 1));
  const daCampanha = desempenho.find((c) => c.campanha_id === teste.campanha_id);
  const amostraAtual = daCampanha?.compras ?? 0;

  const dadosSuficientes = diasRodando >= teste.duracao_minima_dias && amostraAtual >= teste.amostra_minima;

  if (!dadosSuficientes) {
    const { data, error } = await supabase
      .from("test_lab_testes")
      .update({ status: "dados_insuficientes", resultado: `Continuar coleta: ${diasRodando}/${teste.duracao_minima_dias} dias, ${amostraAtual}/${teste.amostra_minima} amostra.` })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível atualizar o teste: ${error.message}`);
    return data;
  }

  const resultado = `Concluído após ${diasRodando} dias e ${amostraAtual} compras. CAC: ${daCampanha?.cac?.toFixed(2) ?? "—"}. ROAS: ${daCampanha?.roas?.toFixed(2) ?? "—"}.`;
  const { data, error } = await supabase
    .from("test_lab_testes")
    .update({ status: "concluido", concluido_em: new Date().toISOString(), resultado })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível concluir o teste: ${error.message}`);
  return data;
}
