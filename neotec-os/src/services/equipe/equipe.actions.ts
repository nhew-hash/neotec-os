"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

function gerarSenhaProvisoria(): string {
  return Math.random().toString(36).slice(-8);
}

/**
 * Cria uma conta de funcionário — nunca existiu uma tela pra isso no
 * Neotec OS inteiro (sempre foi feito direto no Supabase). Mesmo
 * padrão já usado pra dar acesso a investidor/indicador (Fase 186).
 */
export async function criarFuncionarioAction(nome: string, email: string, cargo: string): Promise<ActionResult<{ senhaProvisoria: string }>> {
  if (!nome.trim()) return { success: false, error: "Informe o nome" };
  if (!email.trim()) return { success: false, error: "Informe o e-mail" };

  try {
    const admin = createAdminClient();

    const senhaProvisoria = gerarSenhaProvisoria();
    const { data: authUser, error: erroAuth } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senhaProvisoria,
      email_confirm: true,
    });
    if (erroAuth || !authUser.user) {
      return { success: false, error: erroAuth?.message ?? "Não foi possível criar a conta" };
    }

    const { data: lojaPadrao } = await admin.rpc("default_loja_id");

    const { error: erroUsuario } = await admin.from("usuarios").insert({
      id: authUser.user.id,
      loja_id: lojaPadrao,
      nome: nome.trim(),
      email: email.trim(),
      cargo,
    });
    if (erroUsuario) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: erroUsuario.message };
    }

    revalidatePath("/configuracoes/equipe");
    return { success: true, data: { senhaProvisoria } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar funcionário" };
  }
}

export async function desativarFuncionarioAction(usuarioId: string): Promise<ActionResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(usuarioId);
    if (error) throw new Error(error.message);

    const supabase = await createClient();
    await supabase.from("usuarios").delete().eq("id", usuarioId);

    revalidatePath("/configuracoes/equipe");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao desativar" };
  }
}
