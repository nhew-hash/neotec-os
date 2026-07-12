"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lancamentoSchema } from "./financeiro.schema";
import { criarLancamento } from "./financeiro.service";
import type { ActionResult } from "@/types";

export async function criarLancamentoAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    tipo: String(formData.get("tipo") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    valor: String(formData.get("valor") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
  };

  const parsed = lancamentoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    await criarLancamento({ ...parsed.data, usuario_id: user.id });
    revalidatePath("/financeiro");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar lançamento" };
  }
}
