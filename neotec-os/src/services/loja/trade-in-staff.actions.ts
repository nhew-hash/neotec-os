"use server";

import { revalidatePath } from "next/cache";
import { atualizarStatusTradeIn } from "./trade-in-staff.service";
import type { ActionResult, StatusTradeIn } from "@/types";

export async function atualizarStatusTradeInAction(id: string, status: StatusTradeIn): Promise<ActionResult> {
  try {
    await atualizarStatusTradeIn(id, status);
    revalidatePath("/pedidos-loja");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}
