import { createClient } from "@/lib/supabase/server";
import type { CrmEtapa, CrmCard, CrmTag, CrmFollowup, Cliente } from "@/types";

// ---- Etapas (funil totalmente configurável) ----

export async function listarEtapas(): Promise<CrmEtapa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_etapas").select("*").eq("ativa", true).eq("tipo", "venda").order("ordem");
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
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp" | "temperatura">;
  tags: CrmTag[];
  conversa: { id: string; naoLidas: number } | null;
}

export async function listarCards(): Promise<CardComRelacoes[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_cards")
    .select("*, cliente:clientes(id, nome, whatsapp, temperatura), card_tags:crm_card_tags(tag:crm_tags(*))")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar os cards: ${error.message}`);

  const cardIds = (data ?? []).map((c) => c.id);
  const conversaPorCard = new Map<string, { id: string; naoLidas: number }>();

  if (cardIds.length > 0) {
    const { data: conversas } = await supabase
      .from("whatsapp_conversas")
      .select("id, card_id, nao_lidas, ultima_mensagem_em")
      .in("card_id", cardIds)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });

    // Se por algum motivo houver mais de uma conversa pro mesmo card, fica
    // com a mais recente — a lista já vem ordenada por última mensagem.
    (conversas ?? []).forEach((c) => {
      if (c.card_id && !conversaPorCard.has(c.card_id)) {
        conversaPorCard.set(c.card_id, { id: c.id, naoLidas: c.nao_lidas ?? 0 });
      }
    });
  }

  return (data ?? []).map((card) => ({
    ...(card as unknown as CrmCard),
    cliente: (card as { cliente: Pick<Cliente, "id" | "nome" | "whatsapp" | "temperatura"> }).cliente,
    tags: ((card as { card_tags?: { tag: CrmTag }[] }).card_tags ?? []).map((ct) => ct.tag),
    conversa: conversaPorCard.get(card.id) ?? null,
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

export async function listarFollowupsPendentes(): Promise<(CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> | null; cliente: (Pick<Cliente, "id" | "nome"> & { whatsapp?: string }) | null })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_followups")
    .select("*, card:crm_cards(id, titulo, cliente:clientes(id, nome, whatsapp)), cliente:clientes(id, nome, whatsapp)")
    .eq("status", "pendente")
    .order("data_agendada");

  if (error) throw new Error(`Não foi possível carregar os follow-ups: ${error.message}`);

  // Normaliza — se o vínculo for só pelo card (followup mais antigo, de
  // antes da Fase 179), pega o cliente de dentro do card. Nunca fica
  // sem mostrar quem é o cliente, não importa qual dos dois caminhos
  // foi usado pra criar o follow-up.
  return (data ?? []).map((f) => {
    const registro = f as unknown as { card: { id: string; titulo: string; cliente: { id: string; nome: string; whatsapp: string } | null } | null; cliente: { id: string; nome: string; whatsapp: string } | null };
    return {
      ...(f as unknown as CrmFollowup),
      card: registro.card ? { id: registro.card.id, titulo: registro.card.titulo } : null,
      cliente: registro.cliente ?? registro.card?.cliente ?? null,
    };
  });
}

export async function criarFollowup(input: { card_id?: string; cliente_id?: string; data_agendada: string; motivo: string; usuario_id: string }): Promise<CrmFollowup> {
  if (!input.card_id && !input.cliente_id) throw new Error("Informe um card ou um cliente pra vincular o follow-up");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_followups")
    .insert({ card_id: input.card_id ?? null, cliente_id: input.cliente_id ?? null, data_agendada: input.data_agendada, motivo: input.motivo, usuario_id: input.usuario_id })
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

/**
 * Chamado pelo cron diário — gera follow-up automático pra cards
 * parados tempo demais na mesma etapa, sem que ninguém tenha mexido.
 * Nunca duplica: se já existe um follow-up pendente pra esse card, não
 * cria outro. Nunca mexe em card perdido (já não é mais uma
 * oportunidade ativa).
 */
export async function gerarFollowupsAutomaticos(): Promise<{ criados: number }> {
  const supabase = await createClient();

  const { data: etapas } = await supabase.from("crm_etapas").select("id, nome, dias_para_alerta").not("dias_para_alerta", "is", null);
  if (!etapas || etapas.length === 0) return { criados: 0 };

  let criados = 0;

  for (const etapa of etapas) {
    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - (etapa.dias_para_alerta ?? 999));

    const { data: cardsParados } = await supabase
      .from("crm_cards")
      .select("id, titulo, cliente_id")
      .eq("etapa_id", etapa.id)
      .eq("perdido", false)
      .lt("entrou_etapa_em", limiteData.toISOString());

    for (const card of cardsParados ?? []) {
      const { data: followupExistente } = await supabase
        .from("crm_followups")
        .select("id")
        .eq("card_id", card.id)
        .eq("status", "pendente")
        .limit(1)
        .maybeSingle();

      if (followupExistente) continue; // já tem lembrete pendente, não duplica

      await supabase.from("crm_followups").insert({
        card_id: card.id,
        data_agendada: new Date().toISOString(),
        motivo: `⏰ Parado em "${etapa.nome}" há mais de ${etapa.dias_para_alerta} dia(s) — dar uma olhada`,
        status: "pendente",
      });
      criados++;
    }
  }

  return { criados };
}
