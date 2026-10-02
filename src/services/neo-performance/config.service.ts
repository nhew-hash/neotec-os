import { createClient } from "@/lib/supabase/server";
import type { NeoPerformanceConfig, FeatureFlag } from "@/types";

/** Perfil de Performance + Limites de orçamento (Seções 2 e 3). Uma linha por loja, criada pela migração fase259. */
export async function buscarConfig(): Promise<NeoPerformanceConfig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("neo_performance_config").select("*").maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a configuração do NEO Performance: ${error.message}`);
  return data;
}

export async function atualizarConfig(
  input: Partial<Omit<NeoPerformanceConfig, "id" | "loja_id" | "updated_at">>
): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("neo_performance_config").select("id").maybeSingle();
  if (!linha) throw new Error("Configuração do NEO Performance ainda não existe para esta loja");
  const { error } = await supabase.from("neo_performance_config").update(input).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível salvar a configuração: ${error.message}`);
}

/** Feature flags do módulo (Seção 62) — liga/desliga cada parte sem precisar de deploy. */
export async function listarFlags(): Promise<FeatureFlag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("feature_flags").select("*").order("chave");
  if (error) throw new Error(`Não foi possível carregar as feature flags: ${error.message}`);
  return data ?? [];
}

export async function flagAtiva(chave: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("ativo").eq("chave", chave).maybeSingle();
  return data?.ativo ?? false;
}

export async function alternarFlag(chave: string, ativo: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("feature_flags").update({ ativo }).eq("chave", chave);
  if (error) throw new Error(`Não foi possível alterar a flag: ${error.message}`);
}
