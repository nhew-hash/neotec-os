import { createClient } from "@/lib/supabase/server";
import type { Oportunidade, StatusOportunidade } from "@/types";

export async function listarOportunidades(status?: StatusOportunidade): Promise<Oportunidade[]> {
  const supabase = await createClient();
  let query = supabase.from("oportunidades").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as oportunidades: ${error.message}`);
  return data ?? [];
}

export async function criarOportunidade(input: {
  titulo: string;
  origem: string;
  evidencias?: string;
  produto?: string;
  publico?: string;
  potencial?: string;
}): Promise<Oportunidade> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oportunidades")
    .insert({
      titulo: input.titulo,
      origem: input.origem,
      evidencias: input.evidencias ?? null,
      produto: input.produto ?? null,
      publico: input.publico ?? null,
      potencial: input.potencial ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar a oportunidade: ${error.message}`);
  return data;
}

export async function atualizarStatusOportunidade(id: string, status: StatusOportunidade): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("oportunidades").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar a oportunidade: ${error.message}`);
}

/**
 * Detecta oportunidades a partir do que já existe (Seção 40: cruzar
 * tendência/produto/margem/estoque/campanha) e cria um registro em
 * 'descoberta' pra cada uma que ainda não tiver equivalente aberto —
 * nunca duplica a mesma oportunidade a cada execução.
 */
export async function detectarOportunidades(): Promise<{ criadas: number }> {
  const supabase = await createClient();
  let criadas = 0;

  const { obterOportunidadesEstoque } = await import("./product-performance.service");
  const estoque = await obterOportunidadesEstoque(30);

  for (const o of estoque) {
    if (o.tipo !== "estoque_alto_boa_margem") continue; // só a oportunidade "positiva" vira candidata de campanha — baixo/parado já são alertas, não oportunidade de investimento
    const { data: existente } = await supabase.from("oportunidades").select("id").eq("origem", "estoque").ilike("titulo", `%${o.nome}%`).eq("status", "descoberta").maybeSingle();
    if (existente) continue;

    await criarOportunidade({
      titulo: `Investir em ${o.nome}`,
      origem: "estoque",
      evidencias: o.sugestao,
      produto: o.nome,
      potencial: "médio",
    });
    criadas++;
  }

  const { listarDiagnosticos } = await import("./diagnostico.service");
  const eficientes = await listarDiagnosticos("aberto");
  for (const d of eficientes.filter((d) => d.tipo === "campanha_eficiente")) {
    const { data: existente } = await supabase.from("oportunidades").select("id").eq("origem", "diagnostico").eq("campanha_relacionada_id", d.campanha_id).eq("status", "descoberta").maybeSingle();
    if (existente || !d.campanha_id) continue;

    await supabase.from("oportunidades").insert({ titulo: "Escalar campanha eficiente", origem: "diagnostico", evidencias: d.mensagem, campanha_relacionada_id: d.campanha_id, potencial: "alto" });
    criadas++;
  }

  return { criadas };
}
