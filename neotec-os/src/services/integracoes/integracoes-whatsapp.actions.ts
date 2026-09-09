"use server";

import { revalidatePath } from "next/cache";
import {
  salvarProviderAtivo, conectarWhatsappWeb, desconectarWhatsappWeb,
} from "./integracoes-whatsapp.service";
import type { ActionResult, WhatsappProviderTipo } from "@/types";

export async function salvarProviderAction(provider: WhatsappProviderTipo): Promise<ActionResult> {
  try {
    await salvarProviderAtivo(provider);
    revalidatePath("/configuracoes/integracoes/whatsapp");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function conectarWhatsappWebAction(): Promise<ActionResult> {
  const resultado = await conectarWhatsappWeb();
  if (!resultado.ok) return { success: false, error: resultado.erro ?? "Não foi possível conectar" };
  revalidatePath("/configuracoes/integracoes/whatsapp");
  return { success: true, data: undefined };
}

export async function desconectarWhatsappWebAction(): Promise<ActionResult> {
  const resultado = await desconectarWhatsappWeb();
  if (!resultado.ok) return { success: false, error: resultado.erro ?? "Não foi possível desconectar" };
  revalidatePath("/configuracoes/integracoes/whatsapp");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
