"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function portalSignInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { success: false, error: "Informe e-mail e senha" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { success: false, error: "E-mail ou senha incorretos" };

  // Confirma que esta conta de Auth é vinculada a um cliente do portal —
  // e não, por engano, a conta de um membro da equipe.
  const { data: cliente } = await supabase
    .from("clientes").select("id, senha_provisoria").eq("portal_user_id", data.user.id).maybeSingle();

  if (!cliente) {
    await supabase.auth.signOut();
    return { success: false, error: "Esta conta não tem acesso ao portal do cliente" };
  }

  redirect(cliente.senha_provisoria ? "/portal/trocar-senha" : "/portal/dashboard");
}
