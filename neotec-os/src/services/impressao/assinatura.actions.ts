"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { salvarAssinatura, alternarAssinaturaDigital } from "./assinatura.service";
import type { ActionResult, TipoDocumentoImpressao, TipoAssinanteDocumento } from "@/types";

export async function salvarAssinaturaAction(input: {
  tipoDocumento: TipoDocumentoImpressao;
  referenciaId: string;
  tipoAssinante: TipoAssinanteDocumento;
  imagemBase64: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await salvarAssinatura({ ...input, usuarioId: user.id });
    revalidatePath(`/${input.tipoDocumento === "os" ? "assistencia" : "vendas"}/${input.referenciaId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar assinatura" };
  }
}

export async function alternarAssinaturaDigitalAction(habilitada: boolean): Promise<ActionResult> {
  try {
    await alternarAssinaturaDigital(habilitada);
    revalidatePath("/configuracoes/impressao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
