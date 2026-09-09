"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { impressoraSchema } from "./impressoras.schema";
import { criarImpressora, removerImpressora, alternarStatusImpressora, definirPreferenciaImpressora } from "./impressoras.service";
import type { ActionResult, TipoDocumentoImpressao } from "@/types";

export async function criarImpressoraAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    driver: String(formData.get("driver") ?? ""),
    padrao: formData.get("padrao") === "on",
  };

  const parsed = impressoraSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await criarImpressora(parsed.data);
    revalidatePath("/configuracoes/impressao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar" };
  }
}

export async function removerImpressoraAction(id: string): Promise<ActionResult> {
  try {
    await removerImpressora(id);
    revalidatePath("/configuracoes/impressao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover" };
  }
}

export async function alternarStatusImpressoraAction(id: string, ativa: boolean): Promise<ActionResult> {
  try {
    await alternarStatusImpressora(id, ativa ? "ativa" : "inativa");
    revalidatePath("/configuracoes/impressao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}

export async function definirPreferenciaAction(
  tipoDocumento: TipoDocumentoImpressao,
  impressoraId: string,
  paraLojaInteira: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await definirPreferenciaImpressora(tipoDocumento, impressoraId, paraLojaInteira ? null : user.id);
    revalidatePath("/configuracoes/impressao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar preferência" };
  }
}
