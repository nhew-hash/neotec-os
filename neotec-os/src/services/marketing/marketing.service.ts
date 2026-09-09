import { createClient } from "@/lib/supabase/server";
import type { ConfigMarketingLoja, BarraTopoItem, SeloConfianca } from "@/types";

export async function buscarConfigMarketing(): Promise<ConfigMarketingLoja | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("config_marketing_loja").select("*").maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a configuração: ${error.message}`);
  return data;
}

export async function atualizarConfigMarketing(input: Partial<Pick<ConfigMarketingLoja, "pix_desconto_percentual" | "estoque_baixo_limite" | "contador_vendas_ativo">>): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("config_marketing_loja").select("id").maybeSingle();
  if (!linha) throw new Error("Nenhuma configuração encontrada para esta loja");
  const { error } = await supabase.from("config_marketing_loja").update(input).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
}

// ---- Barra superior ----

export async function listarBarraTopoItens(): Promise<BarraTopoItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("barra_topo_itens").select("*").order("ordem");
  if (error) throw new Error(`Não foi possível carregar a barra: ${error.message}`);
  return data ?? [];
}

export async function criarBarraTopoItem(): Promise<BarraTopoItem> {
  const supabase = await createClient();
  const { data: existentes } = await supabase.from("barra_topo_itens").select("ordem").order("ordem", { ascending: false }).limit(1);
  const proximaOrdem = (existentes?.[0]?.ordem ?? -1) + 1;

  const { data, error } = await supabase.from("barra_topo_itens").insert({ texto: "Novo item", ordem: proximaOrdem }).select("*").single();
  if (error) throw new Error(`Não foi possível criar o item: ${error.message}`);
  return data;
}

export async function atualizarBarraTopoItem(id: string, input: Partial<Pick<BarraTopoItem, "texto" | "icone" | "ativo">>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("barra_topo_itens").update(input).eq("id", id);
  if (error) throw new Error(`Não foi possível salvar o item: ${error.message}`);
}

export async function removerBarraTopoItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("barra_topo_itens").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover: ${error.message}`);
}

export async function reordenarBarraTopoItens(ordemIds: string[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(ordemIds.map((id, index) => supabase.from("barra_topo_itens").update({ ordem: index }).eq("id", id)));
}

// ---- Selos de confiança ----

export async function listarSelosConfianca(): Promise<SeloConfianca[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("selos_confianca").select("*").order("ordem");
  if (error) throw new Error(`Não foi possível carregar os selos: ${error.message}`);
  return data ?? [];
}

export async function atualizarSeloConfianca(id: string, ativo: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("selos_confianca").update({ ativo }).eq("id", id);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
}
