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
    await avisar(async () => {
      const { notificarPedidoDesconto } = await import("@/services/push/push.service");
      const { createClient } = await import("@/lib/supabase/server");
      const { data: eu } = await (await createClient()).from("usuarios").select("nome").eq("id", auth.userId).maybeSingle();
      const bruto = parsed.data.itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0);
      await notificarPedidoDesconto({ solicitanteNome: eu?.nome ?? "A vendedora", percentual: bruto > 0 ? (parsed.data.desconto / bruto) * 100 : 0 });
    });
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
    const solicitanteId = await decidirAprovacaoDesconto(id, aprovar, motivo, auth.userId);
    await avisar(async () => {
      const { notificarDecisaoDesconto } = await import("@/services/push/push.service");
      await notificarDecisaoDesconto({ solicitanteId, aprovado: aprovar });
    });
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

/** Aviso no celular é complemento: a ação já deu certo; falha no aviso só fica no log. */
async function avisar(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("Falha ao avisar no celular:", err instanceof Error ? err.message : err);
  }
}
