"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, error: "Informe e-mail e senha" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { success: false, error: "E-mail ou senha incorretos" };
  }

  // Confirma que esta conta é da equipe (tem linha em `usuarios`) — sem
  // isso, alguém com login só de Portal do Cliente conseguiria "entrar"
  // aqui e só descobrir o problema na tela seguinte.
  const { data: perfil } = await supabase.from("usuarios").select("id").eq("id", data.user.id).maybeSingle();

  if (!perfil) {
    await supabase.auth.signOut();
    return { success: false, error: "Esta conta não tem acesso à área da equipe" };
  }

  redirect("/dashboard");
}

export async function solicitarRecuperacaoSenhaAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  if (!email) return { success: false, error: "Informe seu e-mail" };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/login/equipe/redefinir-senha`,
  });

  // Não revelamos se o e-mail existe ou não (evita enumeração de contas) —
  // a mensagem de sucesso é sempre a mesma, exista o e-mail ou não.
  if (error) {
    return { success: false, error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." };
  }

  return { success: true, data: undefined };
}

export async function redefinirSenhaAction(formData: FormData): Promise<ActionResult> {
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 6) return { success: false, error: "A senha precisa ter pelo menos 6 caracteres" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Link expirado. Solicite a recuperação de senha novamente." };

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { success: false, error: error.message };

  return { success: true, data: undefined };
}
