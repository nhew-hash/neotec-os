"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function atualizarStatusLeadProstecAction(leadId: string, novoStatus: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: leadAtual } = await supabase.from("prostec_leads").select("status").eq("id", leadId).maybeSingle();

    const { error } = await supabase.from("prostec_leads").update({ status: novoStatus, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw new Error(error.message);

    await supabase.from("prostec_lead_status_history").insert({
      lead_id: leadId, from_status: leadAtual?.status ?? null, to_status: novoStatus, changed_by: user?.id ?? null,
    });

    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function adicionarNotaLeadAction(leadId: string, nota: string): Promise<ActionResult> {
  if (!nota.trim()) return { success: false, error: "Escreve alguma coisa" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_notes").insert({ lead_id: leadId, user_id: user?.id ?? null, note: nota.trim() });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar nota" };
  }
}

export async function registrarContatoLeadAction(leadId: string, contactType: string, result: string, notes: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_contacts").insert({
      lead_id: leadId, user_id: user?.id ?? null, contact_type: contactType, result, notes: notes.trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar contato" };
  }
}

export async function agendarFollowupLeadAction(leadId: string, data: string, hora: string, observacao: string): Promise<ActionResult> {
  if (!data) return { success: false, error: "Escolhe uma data" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_followups").insert({
      lead_id: leadId, user_id: user?.id ?? null, next_contact_date: data, next_contact_time: hora || null, observation: observacao.trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar follow-up" };
  }
}

export async function concluirFollowupLeadAction(followupId: string, leadId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_lead_followups").update({ done: true }).eq("id", followupId);
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao concluir follow-up" };
  }
}

export async function salvarConfiguracoesProstecAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_settings").update({
      score_quente_min: Number(formData.get("score_quente_min")),
      score_morno_min: Number(formData.get("score_morno_min")),
      raio_padrao_km: Number(formData.get("raio_padrao_km")),
      quantidade_padrao: Number(formData.get("quantidade_padrao")),
      comissao_pct_padrao: Number(formData.get("comissao_pct_padrao")),
      valor_venda_padrao: Number(formData.get("valor_venda_padrao")),
      segmentos_disponiveis: String(formData.get("segmentos_disponiveis") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      cidades_sugeridas: String(formData.get("cidades_sugeridas") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq("id", "default");
    if (error) throw new Error(error.message);
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configurações" };
  }
}
export async function registrarVendaProstecAction(leadId: string, product: string, amount: number, comissaoPct: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { data: venda, error: erroVenda } = await supabase
      .from("prostec_sales")
      .insert({ lead_id: leadId, user_id: user.id, product, amount })
      .select("id")
      .single();
    if (erroVenda) throw new Error(erroVenda.message);

    const valorComissao = Math.round(amount * (comissaoPct / 100) * 100) / 100;
    await supabase.from("prostec_commissions").insert({ sale_id: venda.id, user_id: user.id, pct: comissaoPct, amount: valorComissao });

    await supabase.from("prostec_leads").update({ status: "vendido" }).eq("id", leadId);

    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar venda" };
  }
}
