"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarMensagem, marcarConversaComoLida } from "./whatsapp.service";
import type { ActionResult } from "@/types";

export async function enviarMensagemAction(formData: FormData): Promise<ActionResult> {
  const conversaId = String(formData.get("conversaId") ?? "");
  const telefone = String(formData.get("telefone") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  if (!texto) return { success: false, error: "Digite uma mensagem" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await enviarMensagem({ conversaId, telefone, texto, usuarioId: user.id });
    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar mensagem" };
  }
}

export async function marcarConversaComoLidaAction(conversaId: string): Promise<ActionResult> {
  try {
    await marcarConversaComoLida(conversaId);
    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao marcar como lida" };
  }
}

export async function alternarIAPausadaAction(conversaId: string, pausar: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("whatsapp_conversas").update({ ia_pausada: pausar }).eq("id", conversaId);
    if (error) throw new Error(error.message);
    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar a IA" };
  }
}
