"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { entradaLoteSchema, type EntradaLoteValues } from "./entrada-lote.schema";
import { registrarEntradaLote } from "./estoque.service";
import type { ActionResult } from "@/types";

export async function registrarEntradaLoteAction(input: EntradaLoteValues): Promise<ActionResult<{ quantidade: number }>> {
  const parsed = entradaLoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    await registrarEntradaLote(parsed.data.itens, parsed.data.fornecedor, user.id);
    revalidatePath("/estoque");
    return { success: true, data: { quantidade: parsed.data.itens.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar entrada" };
  }
}
