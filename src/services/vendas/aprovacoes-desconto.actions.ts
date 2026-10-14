"use server";

import { revalidatePath } from "next/cache";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { pdvVendaSchema, type PdvVendaValues } from "./pdv.schema";
import { decidirAprovacaoDesconto, listarMinhasAprovacoes, solicitarAprovacaoDesconto } from "./aprovacoes-desconto.service";
import type { ActionResult } from "@/types";

export async function solicitarAprovacaoDescontoAction(input: PdvVendaValues, motivo: string): Promise<ActionResult<{ aprovacaoId: string }>> {
  const auth = await exigirCargo(["admin", "gerente", "vendedor", "caixa"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = pdvVendaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  try {
    const aprovacaoId = await solicitarAprovacaoDesconto(parsed.data, motivo, auth.userId);
    revalidatePath("/central-comercial/gerente");
    return { success: true, data: { aprovacaoId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao pedir aprovação" };
  }
}

export async function decidirAprovacaoDescontoAction(id: string, aprovar: boolean, motivo: string): Promise<ActionResult> {
  const auth = await exigirCargo(["admin", "gerente"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!aprovar && !motivo.trim()) return { success: false, error: "Informe o motivo da recusa." };
  try {
    await decidirAprovacaoDesconto(id, aprovar, motivo, auth.userId);
    revalidatePath("/central-comercial/gerente");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar decisão" };
  }
}

/** Aprovações já concedidas ao vendedor logado, ainda válidas — aparecem no PDV para anexar à venda. */
export async function listarMinhasAprovacoesConcedidasAction(): Promise<ActionResult<{ id: string; valorDesconto: number; percentual: number; criadoEm: string }[]>> {
  const auth = await exigirCargo(["admin", "gerente", "vendedor", "caixa"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const todas = await listarMinhasAprovacoes(auth.userId);
    const agora = Date.now();
    return {
      success: true,
      data: todas.filter((a) => a.status === "aprovada" && new Date(a.expira_em).getTime() > agora)
        .map((a) => ({ id: a.id, valorDesconto: a.valor_desconto, percentual: a.percentual, criadoEm: a.criado_em })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar aprovações" };
  }
}
