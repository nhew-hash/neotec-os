"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarAcessoPortal, trocarSenhaPrimeiroAcesso, autoCadastrarCliente } from "./portal.service";
import { portalCadastroSchema } from "./portal.schema";
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

export async function portalCadastroAction(formData: FormData): Promise<ActionResult> {
  const parsed = portalCadastroSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await autoCadastrarCliente(parsed.data);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar sua conta" };
  }

  // Autentica na hora — o cliente não deveria precisar logar de novo
  // logo depois de acabar de se cadastrar.
  const supabase = await createClient();
  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (erroLogin) {
    // Conta foi criada com sucesso; só o login automático falhou —
    // manda pro login normal em vez de mostrar um erro confuso.
    redirect("/portal/login");
  }

  redirect("/portal/dashboard");
}
