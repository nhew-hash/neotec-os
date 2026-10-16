"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarMensagem, marcarConversaComoLida, enviarMensagemComMidia, exigirEnvioConfirmado, listarMensagens, listarConversas, type ConversaComCliente } from "./whatsapp.service";
import { uploadMidiaWhatsapp } from "./whatsapp-midia.service";
import type { ActionResult, StatusConversaWhatsapp, WhatsappMensagem } from "@/types";

export async function enviarMensagemAction(formData: FormData): Promise<ActionResult> {
  const conversaId = String(formData.get("conversaId") ?? "");
  const telefone = String(formData.get("telefone") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  if (!texto) return { success: false, error: "Digite uma mensagem" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const msg = await enviarMensagem({ conversaId, telefone, texto, usuarioId: user.id });
    revalidatePath("/comunicacao");
    // A mensagem fica no histórico de qualquer jeito, mas a tela só diz
    // "enviado" quando o provedor confirmou (antes retornava sucesso mesmo
    // com o provedor recusando — a pessoa achava que o cliente recebeu).
    exigirEnvioConfirmado(msg);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar mensagem" };
  }
}

/** Página anterior do histórico (o chat abre só com as últimas mensagens). */
export async function carregarMensagensAnterioresAction(conversaId: string, antesDe: string): Promise<ActionResult<{ mensagens: WhatsappMensagem[]; temMais: boolean }>> {
  try {
    return { success: true, data: await listarMensagens(conversaId, { antesDe }) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar mensagens anteriores" };
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
  if (!arquivo.type.startsWith("audio/")) return { success: false, error: "Arquivo de áudio inválido" };
  // Limite de mídia de áudio do WhatsApp (16 MB) — acima disso o provedor recusaria depois do upload.
  if (arquivo.size > 16 * 1024 * 1024) return { success: false, error: "Áudio longo demais (máx. 16 MB)" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const extensao = arquivo.type.includes("ogg") ? "ogg" : arquivo.type.includes("mp4") ? "m4a" : "webm";
    const caminho = await uploadMidiaWhatsapp(conversaId, bytes, extensao);

    const msg = await enviarMensagemComMidia({
      conversaId, telefone, caminhoMidia: caminho, mimeType: arquivo.type || "audio/ogg", usuarioId: user.id,
    });

    revalidatePath("/comunicacao");
    exigirEnvioConfirmado(msg);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar áudio" };
  }
}

/** Foto tirada na hora (câmera) ou escolhida no aparelho — vai para o cliente pela conversa. */
export async function enviarFotoAction(formData: FormData): Promise<ActionResult> {
  const conversaId = String(formData.get("conversaId") ?? "");
  const telefone = String(formData.get("telefone") ?? "");
  const legenda = String(formData.get("legenda") ?? "").slice(0, 1000);
  const arquivo = formData.get("foto") as File | null;

  if (!arquivo) return { success: false, error: "Nenhuma foto recebida" };
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return { success: false, error: "Formato de foto não aceito (use JPG, PNG ou WebP)" };
  if (arquivo.size > 5 * 1024 * 1024) return { success: false, error: "Foto grande demais (máx. 5 MB)" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
    const caminho = await uploadMidiaWhatsapp(conversaId, bytes, extensao);

    const msg = await enviarMensagemComMidia({
      conversaId, telefone, caminhoMidia: caminho, mimeType: arquivo.type, usuarioId: user.id, tipo: "imagem", legenda,
    });

    revalidatePath("/comunicacao");
    exigirEnvioConfirmado(msg);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar foto" };
  }
}

export async function enviarFotoCatalogoAction(conversaId: string, telefone: string, urlFoto: string, legenda?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { enviarFotoCatalogo } = await import("./whatsapp.service");
    const msg = await enviarFotoCatalogo({ conversaId, telefone, urlFoto, legenda, usuarioId: user.id });

    revalidatePath("/comunicacao");
    exigirEnvioConfirmado(msg);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar foto" };
  }
}

const STATUS_VALIDOS: StatusConversaWhatsapp[] = ["aberta", "aguardando_cliente", "resolvida", "perdida"];

/** "Assumir" (responsável = eu) ou liberar a conversa. */
export async function definirResponsavelConversaAction(conversaId: string, assumir: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };
    const { data, error } = await supabase
      .from("whatsapp_conversas")
      .update({ responsavel_id: assumir ? user.id : null })
      .eq("id", conversaId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Conversa não encontrada ou sem permissão.");
    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao definir responsável" };
  }
}

/**
 * Status do atendimento. "Resolvida"/"Perdida" encerram o atendimento: a
 * próxima mensagem do cliente abre uma conversa nova (comportamento que o
 * recebimento já tinha — só procura conversa "aberta").
 */
export async function alterarStatusConversaAction(conversaId: string, status: StatusConversaWhatsapp): Promise<ActionResult> {
  if (!STATUS_VALIDOS.includes(status)) return { success: false, error: "Status inválido" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("whatsapp_conversas").update({ status }).eq("id", conversaId).select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Conversa não encontrada ou sem permissão.");
    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao alterar o status" };
  }
}

/** Busca no servidor por telefone — alcança conversas além das recentes que a lista carrega. */
export async function buscarConversasAction(busca: string): Promise<ActionResult<ConversaComCliente[]>> {
  try {
    return { success: true, data: await listarConversas({ busca }) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar conversas" };
  }
}
