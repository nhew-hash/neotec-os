"use server";

import { revalidatePath } from "next/cache";
import { atualizarConfigPrecificacao, atualizarTaxaParcelamento } from "./config-precificacao.service";
import type { ActionResult, ConfiguracaoPrecificacao } from "@/types";

function revalidar() {
  revalidatePath("/configuracoes/financeiro/parcelamento");
  revalidatePath("/loja");
}

export async function atualizarConfigPrecificacaoAction(
  input: Partial<Pick<ConfiguracaoPrecificacao, "modo_juros" | "desconto_pix_percentual">>
): Promise<ActionResult> {
  try {
    await atualizarConfigPrecificacao(input);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function atualizarTaxaParcelamentoAction(id: string, taxaPercentual: number): Promise<ActionResult> {
  try {
    await atualizarTaxaParcelamento(id, taxaPercentual);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
