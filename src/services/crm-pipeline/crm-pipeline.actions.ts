"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crmCardSchema, crmFollowupSchema } from "./crm-pipeline.schema";
import { criarCard, moverCardEtapa, criarFollowup, concluirFollowup } from "./crm-pipeline.service";
import type { ActionResult } from "@/types";

export async function criarCardAction(formData: FormData): Promise<ActionResult> {
  const parsed = crmCardSchema.safeParse({
    cliente_id: String(formData.get("cliente_id") ?? ""),
    etapa_id: String(formData.get("etapa_id") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    valor_estimado: String(formData.get("valor_estimado") ?? ""),
    responsavel_id: String(formData.get("responsavel_id") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await criarCard(parsed.data);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar oportunidade" };
  }
}

export async function moverCardEtapaAction(cardId: string, etapaId: string): Promise<ActionResult> {
  try {
    await moverCardEtapa(cardId, etapaId);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao mover card" };
  }
}

export async function criarFollowupAction(formData: FormData): Promise<ActionResult> {
  const parsed = crmFollowupSchema.safeParse({
    card_id: String(formData.get("card_id") ?? ""),
    data_agendada: String(formData.get("data_agendada") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await criarFollowup({ ...parsed.data, usuario_id: user.id });
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar follow-up" };
  }
}

export async function concluirFollowupAction(id: string): Promise<ActionResult> {
  try {
    await concluirFollowup(id);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao concluir follow-up" };
  }
}

export async function marcarCardPerdidoAction(cardId: string, motivo: string): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_cards")
      .update({ perdido: true, motivo_perda: motivo, status_recuperacao: "sem_retorno" })
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao marcar como perdido" };
  }
}

export async function reabrirCardAction(cardId: string): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_cards")
      .update({ perdido: false, motivo_perda: null, status_recuperacao: "ativo" })
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reabrir" };
  }
}
