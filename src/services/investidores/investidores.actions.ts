"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { investidorSchema, movimentoInvestidorSchema } from "./investidores.schema";
import { criarInvestidor, registrarMovimentoInvestidor } from "./investidores.service";
import type { ActionResult, Investidor } from "@/types";

export async function criarInvestidorAction(formData: FormData): Promise<ActionResult<Investidor>> {
  const parsed = investidorSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const investidor = await criarInvestidor(parsed.data);
    revalidatePath("/investidores");
    return { success: true, data: investidor };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar investidor" };
  }
}

export async function registrarMovimentoInvestidorAction(formData: FormData): Promise<ActionResult> {
  const parsed = movimentoInvestidorSchema.safeParse({
    investidor_id: String(formData.get("investidor_id") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    valor: String(formData.get("valor") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await registrarMovimentoInvestidor({ ...parsed.data, usuario_id: user.id });
    revalidatePath(`/investidores/${parsed.data.investidor_id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar movimento" };
  }
}
