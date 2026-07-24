"use server";

import { revalidatePath } from "next/cache";
import { atualizarVarianteLacrado } from "./lacrados.service";
import { interpretarTabelaFornecedor, aplicarAtualizacaoLacrados, type ItemTabelaFornecedor } from "./lacrados-ia.service";
import type { ActionResult } from "@/types";

export async function atualizarVarianteLacradoAction(
  id: string,
  input: { quantidade?: number; preco_venda?: number | null; ativo?: boolean }
): Promise<ActionResult> {
  try {
    await atualizarVarianteLacrado(id, input);
    revalidatePath("/estoque/lacrados");
    revalidatePath("/loja");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}

export async function interpretarTabelaFornecedorAction(texto: string): Promise<ActionResult<{ itens: ItemTabelaFornecedor[] }>> {
  try {
    const itens = await interpretarTabelaFornecedor(texto);
    return { success: true, data: { itens } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao interpretar" };
  }
}

export async function aplicarAtualizacaoLacradosAction(itens: { varianteId: string; preco: number }[]): Promise<ActionResult> {
  try {
    await aplicarAtualizacaoLacrados(itens);
    revalidatePath("/estoque/lacrados");
    revalidatePath("/loja");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao aplicar atualização" };
  }
}
