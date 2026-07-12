"use server";

import { revalidatePath } from "next/cache";
import { criarAcessoPortal, trocarSenhaPrimeiroAcesso } from "./portal.service";
import type { ActionResult } from "@/types";

export async function criarAcessoPortalAction(clienteId: string): Promise<ActionResult<{ email: string; senhaProvisoria: string }>> {
  try {
    const resultado = await criarAcessoPortal(clienteId);
    revalidatePath(`/clientes/${clienteId}`);
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar acesso do portal" };
  }
}

export async function trocarSenhaPrimeiroAcessoAction(formData: FormData): Promise<ActionResult> {
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 6) return { success: false, error: "A senha precisa ter pelo menos 6 caracteres" };

  try {
    await trocarSenhaPrimeiroAcesso(novaSenha);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao trocar senha" };
  }
}
