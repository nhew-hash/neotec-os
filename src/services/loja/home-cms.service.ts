import { createClient } from "@/lib/supabase/server";
import type { HeroSlide, HomeSecao, TipoSecaoHome } from "@/types";

// ---- Hero Slides ----

export async function listarHeroSlides(): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("hero_slides").select("*").order("prioridade");
  if (error) throw new Error(`Não foi possível carregar os slides: ${error.message}`);
  return data ?? [];
}

export async function criarHeroSlide(input: Partial<HeroSlide>): Promise<HeroSlide> {
  const supabase = await createClient();
  const { data: existentes } = await supabase.from("hero_slides").select("prioridade").order("prioridade", { ascending: false }).limit(1);
  const proximaPrioridade = (existentes?.[0]?.prioridade ?? -1) + 1;

  const { data, error } = await supabase
    .from("hero_slides")
    .insert({ titulo: input.titulo ?? "Novo slide", prioridade: proximaPrioridade })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar o slide: ${error.message}`);
  return data;
}

export async function atualizarHeroSlide(id: string, input: Partial<HeroSlide>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("hero_slides").update(input).eq("id", id);
  if (error) throw new Error(`Não foi possível salvar o slide: ${error.message}`);
}

export async function removerHeroSlide(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("hero_slides").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover o slide: ${error.message}`);
}

export async function reordenarHeroSlides(ordemIds: string[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(ordemIds.map((id, index) => supabase.from("hero_slides").update({ prioridade: index }).eq("id", id)));
}

// ---- Seções da Home ----

export async function listarHomeSecoes(): Promise<HomeSecao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("home_secoes").select("*").order("ordem");
  if (error) throw new Error(`Não foi possível carregar as seções: ${error.message}`);
  return data ?? [];
}

export async function criarHomeSecao(tipo: TipoSecaoHome): Promise<HomeSecao> {
  const supabase = await createClient();
  const { data: existentes } = await supabase.from("home_secoes").select("ordem").order("ordem", { ascending: false }).limit(1);
  const proximaOrdem = (existentes?.[0]?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("home_secoes")
    .insert({ tipo, ordem: proximaOrdem, configuracao: {} })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar a seção: ${error.message}`);
  return data;
}

export async function atualizarHomeSecao(id: string, input: Partial<Pick<HomeSecao, "ativo" | "configuracao" | "data_inicio" | "data_fim">>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("home_secoes").update(input).eq("id", id);
  if (error) throw new Error(`Não foi possível salvar a seção: ${error.message}`);
}

export async function removerHomeSecao(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("home_secoes").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover a seção: ${error.message}`);
}

export async function reordenarHomeSecoes(ordemIds: string[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(ordemIds.map((id, index) => supabase.from("home_secoes").update({ ordem: index }).eq("id", id)));
}
