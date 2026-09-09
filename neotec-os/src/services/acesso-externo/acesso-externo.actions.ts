"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

function gerarSenhaProvisoria(): string {
  return Math.random().toString(36).slice(-8);
}

/**
 * Cria login pra um investidor ou indicador já cadastrado — eles
 * nunca tinham acesso próprio antes (Fase 186), só existiam como
 * registro que a equipe gerenciava. Senha provisória, mesmo padrão já
 * usado pro Portal do Cliente.
 */
export async function criarAcessoExternoAction(
  tipo: "investidor" | "indicador",
  registroId: string,
  email: string
): Promise<ActionResult<{ senhaProvisoria: string }>> {
  if (!email.trim()) return { success: false, error: "Informe um e-mail" };

  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const tabela = tipo === "investidor" ? "investidores" : "indicadores";
    const { data: registro } = await supabase.from(tabela).select("id, nome").eq("id", registroId).maybeSingle();
    if (!registro) return { success: false, error: "Registro não encontrado" };

    const senhaProvisoria = gerarSenhaProvisoria();
    const { data: authUser, error: erroAuth } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senhaProvisoria,
      email_confirm: true,
    });
    if (erroAuth || !authUser.user) {
      return { success: false, error: erroAuth?.message ?? "Não foi possível criar o acesso" };
    }

    const { data: lojaPadrao } = await admin.rpc("default_loja_id");

    const { error: erroUsuario } = await admin.from("usuarios").upsert({
      id: authUser.user.id,
      loja_id: lojaPadrao,
      nome: registro.nome,
      email: email.trim(),
      cargo: tipo,
      [tipo === "investidor" ? "investidor_id" : "indicador_id"]: registroId,
    });
    if (erroUsuario) {
      // Reverte a conta de auth criada, pra não sobrar login órfão sem linha em usuarios.
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: erroUsuario.message };
    }

    revalidatePath(`/${tipo === "investidor" ? "investidores" : "indicacoes"}`);
    return { success: true, data: { senhaProvisoria } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar acesso" };
  }
}
