"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { indicadorSchema, movimentoIndicadorSchema } from "./indicacoes.schema";
import { criarIndicador, registrarMovimentoIndicador } from "./indicacoes.service";
import type { ActionResult } from "@/types";

export async function criarIndicadorAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const raw = {
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };

  const parsed = indicadorSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const indicador = await criarIndicador(parsed.data);
    revalidatePath("/indicacoes");
    return { success: true, data: { id: indicador.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar" };
  }
}

export async function registrarMovimentoIndicadorAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    indicador_id: String(formData.get("indicador_id") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    valor: String(formData.get("valor") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  };

  const parsed = movimentoIndicadorSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await registrarMovimentoIndicador(parsed.data, user.id);
    revalidatePath("/indicacoes");
    revalidatePath(`/indicacoes/${parsed.data.indicador_id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar movimento" };
  }
}
