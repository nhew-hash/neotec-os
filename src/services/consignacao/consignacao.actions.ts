"use server";

import { revalidatePath } from "next/cache";
import { consignacaoSchema } from "./consignacao.schema";
import { criarConsignacao, atualizarStatusConsignacao } from "./consignacao.service";
import type { ActionResult, StatusConsignacao } from "@/types";

export async function criarConsignacaoAction(formData: FormData): Promise<ActionResult> {
  const parsed = consignacaoSchema.safeParse({
    cliente_id: String(formData.get("cliente_id") ?? ""),
    aparelho_id: String(formData.get("aparelho_id") ?? ""),
    valor_combinado: String(formData.get("valor_combinado") ?? ""),
    prazo: String(formData.get("prazo") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await criarConsignacao(parsed.data);
    revalidatePath("/consignacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar consignação" };
  }
}

export async function atualizarStatusConsignacaoAction(id: string, status: StatusConsignacao): Promise<ActionResult> {
  try {
    await atualizarStatusConsignacao(id, status);
    revalidatePath("/consignacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}
