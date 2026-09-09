"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { preAnaliseSchema } from "./pre-analise.schema";
import { criarPreAnalise } from "./pre-analise.service";
import type { ActionResult } from "@/types";

/**
 * Público, sem login — mas nunca confia só na validação de tela.
 * Revalida tudo aqui, com o mesmo schema.
 */
export async function criarPreAnaliseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = preAnaliseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    const { id } = await criarPreAnalise(parsed.data);
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Não foi possível enviar sua pré-análise — tenta de novo em instantes." };
  }
}

export async function atualizarStatusPreAnaliseAction(id: string, status: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("crediario_pre_analises").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/crediario/pre-analises");
    revalidatePath(`/crediario/pre-analises/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function salvarObservacaoPreAnaliseAction(id: string, observacoes: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("crediario_pre_analises").update({ observacoes_internas: observacoes }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(`/crediario/pre-analises/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar observação" };
  }
}

export async function salvarWhatsappNotificacaoAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const numero = String(formData.get("whatsapp_notificacao_vendedor") ?? "").replace(/\D/g, "");
    const { error } = await supabase.from("crediario_politicas").update({ whatsapp_notificacao_vendedor: numero || null }).eq("id", "default");
    if (error) throw new Error(error.message);
    revalidatePath("/crediario/pre-analises");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
