import { createClient } from "@/lib/supabase/server";
import type { MapeamentoEmojiCor, PrioridadeBuscaPreco } from "@/types";

export async function buscarPrioridadeBuscaPreco(): Promise<PrioridadeBuscaPreco | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("prioridade_busca_preco").select("*").maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a prioridade de busca: ${error.message}`);
  return data;
}

export async function salvarPrioridadeBuscaPreco(ordem: string[]): Promise<void> {
  const supabase = await createClient();
  const { data: linha, error: erroBusca } = await supabase.from("prioridade_busca_preco").select("id").maybeSingle();
  if (erroBusca) throw new Error(`Não foi possível localizar a configuração: ${erroBusca.message}`);
  if (!linha) throw new Error("Nenhuma configuração de prioridade encontrada para esta loja");

  const { error } = await supabase.from("prioridade_busca_preco").update({ ordem }).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível salvar a prioridade: ${error.message}`);
}

export async function listarMapeamentoEmojiCor(): Promise<MapeamentoEmojiCor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mapeamento_emoji_cor").select("*").order("emoji");
  if (error) throw new Error(`Não foi possível carregar o mapeamento: ${error.message}`);
  return data ?? [];
}

export async function criarMapeamentoEmojiCor(emoji: string, cor: string): Promise<MapeamentoEmojiCor> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mapeamento_emoji_cor").insert({ emoji, cor }).select("*").single();
  if (error) throw new Error(`Não foi possível cadastrar o emoji: ${error.message}`);
  return data;
}

export async function removerMapeamentoEmojiCor(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("mapeamento_emoji_cor").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover o mapeamento: ${error.message}`);
}
