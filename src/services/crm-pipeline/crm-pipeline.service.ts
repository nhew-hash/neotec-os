import { createClient } from "@/lib/supabase/server";
import type { CrmEtapa, CrmCard, CrmTag, CrmFollowup, Cliente } from "@/types";

// ---- Etapas (funil totalmente configurável) ----

export async function listarEtapas(): Promise<CrmEtapa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_etapas").select("*").eq("ativa", true).order("ordem");
  if (error) throw new Error(`Não foi possível carregar as etapas: ${error.message}`);
  return data ?? [];
}

export async function criarEtapa(nome: string, cor: string): Promise<CrmEtapa> {
  const supabase = await createClient();
  const { data: ultima } = await supabase.from("crm_etapas").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
  const proximaOrdem = (ultima?.ordem ?? 0) + 1;

  const { data, error } = await supabase.from("crm_etapas").insert({ nome, cor, ordem: proximaOrdem }).select("*").single();
  if (error) throw new Error(`Não foi possível criar a etapa: ${error.message}`);
  return data;
}

export async function reordenarEtapas(ordemIds: string[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    ordemIds.map((id, index) => supabase.from("crm_etapas").update({ ordem: index + 1 }).eq("id", id))
  );
}

// ---- Cards ----

export interface CardComRelacoes extends CrmCard {
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp">;
  tags: CrmTag[];
}

export async function listarCards(): Promise<CardComRelacoes[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_cards")
    .select("*, cliente:clientes(id, nome, whatsapp), card_tags:crm_card_tags(tag:crm_tags(*))")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar os cards: ${error.message}`);

  return (data ?? []).map((card) => ({
    ...(card as unknown as CrmCard),
    cliente: (card as { cliente: Pick<Cliente, "id" | "nome" | "whatsapp"> }).cliente,
    tags: ((card as { card_tags?: { tag: CrmTag }[] }).card_tags ?? []).map((ct) => ct.tag),
  }));
}

export async function criarCard(input: {
  cliente_id: string;
  etapa_id: string;
  titulo: string;
  valor_estimado?: number;
  responsavel_id?: string;
}): Promise<CrmCard> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_cards")
    .insert({
      cliente_id: input.cliente_id,
      etapa_id: input.etapa_id,
      titulo: input.titulo,
      valor_estimado: input.valor_estimado ?? null,
      responsavel_id: input.responsavel_id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar o card: ${error.message}`);
  return data;
}

export async function moverCardEtapa(cardId: string, etapaId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("crm_cards").update({ etapa_id: etapaId }).eq("id", cardId);
  if (error) throw new Error(`Não foi possível mover o card: ${error.message}`);
}

// ---- Tags ----

export async function listarTags(): Promise<CrmTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_tags").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar as tags: ${error.message}`);
  return data ?? [];
}

export async function criarTag(nome: string, cor: string): Promise<CrmTag> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_tags").insert({ nome, cor }).select("*").single();
  if (error) throw new Error(`Não foi possível criar a tag: ${error.message}`);
  return data;
}

export async function vincularTagAoCard(cardId: string, tagId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("crm_card_tags").insert({ card_id: cardId, tag_id: tagId });
  if (error) throw new Error(`Não foi possível vincular a tag: ${error.message}`);
}

// ---- Follow-ups ----

export async function listarFollowupsPendentes(): Promise<(CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_followups")
    .select("*, card:crm_cards(id, titulo)")
    .eq("status", "pendente")
    .order("data_agendada");

  if (error) throw new Error(`Não foi possível carregar os follow-ups: ${error.message}`);
  return (data ?? []) as unknown as (CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> })[];
}

export async function criarFollowup(input: { card_id: string; data_agendada: string; motivo: string; usuario_id: string }): Promise<CrmFollowup> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_followups")
    .insert({ card_id: input.card_id, data_agendada: input.data_agendada, motivo: input.motivo, usuario_id: input.usuario_id })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível agendar o follow-up: ${error.message}`);
  return data;
}

export async function concluirFollowup(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("crm_followups").update({ status: "concluido" }).eq("id", id);
  if (error) throw new Error(`Não foi possível concluir o follow-up: ${error.message}`);
}
