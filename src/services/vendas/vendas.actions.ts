"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orcamentoSchema } from "./vendas.schema";
import { criarOrcamento, aprovarOrcamentoEConverterEmVenda, atualizarChecklistEntrega } from "./vendas.service";
import type { ActionResult } from "@/types";

export async function criarOrcamentoAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    produto_id: String(formData.get("produto_id") ?? ""),
    aparelho_id: String(formData.get("aparelho_id") ?? ""),
    valor: String(formData.get("valor") ?? ""),
    forma_pagamento: String(formData.get("forma_pagamento") ?? ""),
    garantia_dias: String(formData.get("garantia_dias") ?? ""),
    validade: String(formData.get("validade") ?? ""),
  };

  const parsed = orcamentoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    await criarOrcamento({ ...parsed.data, usuario_id: user.id });
    revalidatePath("/vendas");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar orçamento" };
  }
}

export async function aprovarOrcamentoAction(orcamentoId: string): Promise<ActionResult<{ vendaId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    const venda = await aprovarOrcamentoEConverterEmVenda(orcamentoId, user.id);
    revalidatePath("/vendas");
    revalidatePath("/estoque");
    return { success: true, data: { vendaId: venda.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao aprovar orçamento" };
  }
}

export async function atualizarChecklistEntregaAction(
  vendaId: string,
  checklist: {
    checklist_aparelho_conferido: boolean;
    checklist_acessorios_recebidos: boolean;
    checklist_garantia_entregue: boolean;
    checklist_cliente_confirmou: boolean;
  }
): Promise<ActionResult> {
  try {
    await atualizarChecklistEntrega(vendaId, checklist);
    revalidatePath(`/vendas/${vendaId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar checklist" };
  }
}
