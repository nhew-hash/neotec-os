"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarMensagem, marcarConversaComoLida, enviarMensagemComMidia } from "./whatsapp.service";
import { uploadMidiaWhatsapp } from "./whatsapp-midia.service";
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

export async function enviarAudioAction(formData: FormData): Promise<ActionResult> {
  const conversaId = String(formData.get("conversaId") ?? "");
  const telefone = String(formData.get("telefone") ?? "");
  const arquivo = formData.get("audio") as File | null;

  if (!arquivo) return { success: false, error: "Nenhum áudio recebido" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const extensao = arquivo.type.includes("ogg") ? "ogg" : arquivo.type.includes("mp4") ? "m4a" : "webm";
    const caminho = await uploadMidiaWhatsapp(conversaId, bytes, extensao);

    await enviarMensagemComMidia({
      conversaId, telefone, caminhoMidia: caminho, mimeType: arquivo.type || "audio/ogg", usuarioId: user.id,
    });

    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar áudio" };
  }
}

export async function enviarFotoCatalogoAction(conversaId: string, telefone: string, urlFoto: string, legenda?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { enviarFotoCatalogo } = await import("./whatsapp.service");
    await enviarFotoCatalogo({ conversaId, telefone, urlFoto, legenda, usuarioId: user.id });

    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar foto" };
  }
}
