"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ordemServicoSchema, diagnosticoSchema, pecaOsSchema, checklistOsSchema } from "./assistencia.schema";
import {
  criarOrdemServico, atualizarStatusOS, salvarDiagnostico, adicionarPecaOS, salvarChecklistOS,
} from "./assistencia.service";
import type { ActionResult, StatusOS, TipoChecklistOS } from "@/types";

export async function criarOSAction(formData: FormData): Promise<ActionResult<{ id: string; numero: string }>> {
  const raw = {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    aparelho_id: String(formData.get("aparelho_id") ?? ""),
    defeito: String(formData.get("defeito") ?? ""),
    garantia_dias: String(formData.get("garantia_dias") ?? ""),
    prazo: String(formData.get("prazo") ?? ""),
    urgente: formData.get("urgente") === "on",
  };
  const parsed = ordemServicoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const os = await criarOrdemServico(parsed.data);
    revalidatePath("/assistencia");
    return { success: true, data: { id: os.id, numero: os.numero_os } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao abrir OS" };
  }
}

export async function atualizarStatusOSAction(id: string, status: StatusOS): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await atualizarStatusOS(id, status, user?.id);
    revalidatePath(`/assistencia/${id}`);
    revalidatePath("/assistencia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function salvarDiagnosticoAction(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = diagnosticoSchema.safeParse({
    diagnostico: String(formData.get("diagnostico") ?? ""),
    valor: String(formData.get("valor") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await salvarDiagnostico(id, parsed.data.diagnostico, parsed.data.valor);
    revalidatePath(`/assistencia/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar diagnóstico" };
  }
}

export async function adicionarPecaOSAction(osId: string, formData: FormData): Promise<ActionResult> {
  const parsed = pecaOsSchema.safeParse({
    produto_id: String(formData.get("produto_id") ?? ""),
    quantidade: String(formData.get("quantidade") ?? "1"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await adicionarPecaOS(osId, parsed.data.produto_id, parsed.data.quantidade, user.id);
    revalidatePath(`/assistencia/${osId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao adicionar peça" };
  }
}

export async function salvarChecklistOSAction(
  osId: string,
  tipo: TipoChecklistOS,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    liga: formData.get("liga") === "on",
    molhado: formData.get("molhado") === "on",
    arranhado: formData.get("arranhado") === "on",
    tela: formData.get("tela") === "on",
    face_id: formData.get("face_id") === "on",
    touch: formData.get("touch") === "on",
    botoes: formData.get("botoes") === "on",
    cameras: formData.get("cameras") === "on",
    biometria: formData.get("biometria") === "on",
    senha_informada: formData.get("senha_informada") === "on",
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const parsed = checklistOsSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Checklist inválido" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await salvarChecklistOS(osId, tipo, { ...parsed.data, observacoes: parsed.data.observacoes || null }, user.id);
    revalidatePath(`/assistencia/${osId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar checklist" };
  }
}
