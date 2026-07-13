"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pdvVendaSchema, type PdvVendaValues } from "./pdv.schema";
import { criarVendaPDV } from "./pdv.service";
import type { ActionResult } from "@/types";

/**
 * Recebe um objeto tipado direto (não FormData) — o carrinho do PDV é
 * dinâmico (N itens), então serializar em FormData só complicaria sem
 * ganhar nada. Server Actions aceitam objeto serializável normalmente
 * quando chamadas a partir de um Client Component, não só <form action>.
 */
export async function finalizarVendaPDVAction(input: PdvVendaValues): Promise<ActionResult<{ vendaId: string }>> {
  const parsed = pdvVendaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    const venda = await criarVendaPDV(parsed.data, user.id);
    revalidatePath("/vendas");
    revalidatePath("/estoque");
    return { success: true, data: { vendaId: venda.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao finalizar venda" };
  }
}
