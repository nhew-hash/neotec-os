"use server";

import { calcularDestaquePrecoLoja, type DestaquePrecoLoja } from "./precificacao-publico.service";
import type { ActionResult } from "@/types";

export async function calcularDestaquePrecoLojaAction(precoVenda: number, precoLiquidoDesejado: number | null, produtoId?: string, aparelhoId?: string): Promise<ActionResult<DestaquePrecoLoja>> {
  if (precoVenda <= 0) return { success: false, error: "Preço inválido" };
  try {
    const destaque = await calcularDestaquePrecoLoja(precoVenda, precoLiquidoDesejado, produtoId, aparelhoId);
    return { success: true, data: destaque };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao calcular preço" };
  }
}
