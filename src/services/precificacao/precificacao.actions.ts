"use server";

import { revalidatePath } from "next/cache";
import { atualizarConfigPrecificacao, atualizarTaxaParcelamento } from "./config-precificacao.service";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import type { ActionResult, ConfiguracaoPrecificacao } from "@/types";

function revalidar() {
  revalidatePath("/configuracoes/financeiro/parcelamento");
  revalidatePath("/loja", "layout");
}

export async function atualizarConfigPrecificacaoAction(
  input: Partial<Pick<ConfiguracaoPrecificacao, "modo_juros" | "desconto_pix_percentual" | "cashback_percentual_padrao" | "whatsapp_notificacao_staff">>
): Promise<ActionResult> {
  const auth = await exigirCargo(["admin"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await atualizarConfigPrecificacao(input);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function atualizarTaxaParcelamentoAction(id: string, taxaPercentual: number): Promise<ActionResult> {
  const auth = await exigirCargo(["admin"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await atualizarTaxaParcelamento(id, taxaPercentual);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
