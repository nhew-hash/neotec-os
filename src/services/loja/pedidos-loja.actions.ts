"use server";

import { revalidatePath } from "next/cache";
import { atualizarStatusPedidoLoja } from "./pedidos-loja.service";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import type { ActionResult, StatusPedidoLoja } from "@/types";

export async function atualizarStatusPedidoLojaAction(id: string, status: StatusPedidoLoja): Promise<ActionResult> {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await atualizarStatusPedidoLoja(id, status);
    revalidatePath("/pedidos-loja");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}
