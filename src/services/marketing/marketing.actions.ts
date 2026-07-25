"use server";

import { revalidatePath } from "next/cache";
import {
  atualizarConfigMarketing, criarBarraTopoItem, atualizarBarraTopoItem, removerBarraTopoItem,
  reordenarBarraTopoItens, atualizarSeloConfianca,
} from "./marketing.service";
import type { ActionResult, ConfigMarketingLoja, BarraTopoItem } from "@/types";

function revalidarTudo() {
  revalidatePath("/configuracoes/marketing");
  revalidatePath("/loja");
}

export async function atualizarConfigMarketingAction(
  input: Partial<Pick<ConfigMarketingLoja, "pix_desconto_percentual" | "estoque_baixo_limite" | "contador_vendas_ativo">>
): Promise<ActionResult> {
  try {
    await atualizarConfigMarketing(input);
    revalidarTudo();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function criarBarraTopoItemAction(): Promise<ActionResult<{ id: string }>> {
  try {
    const item = await criarBarraTopoItem();
    revalidarTudo();
    return { success: true, data: { id: item.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar" };
  }
}

export async function atualizarBarraTopoItemAction(id: string, input: Partial<Pick<BarraTopoItem, "texto" | "icone" | "ativo">>): Promise<ActionResult> {
  try {
    await atualizarBarraTopoItem(id, input);
    revalidarTudo();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function removerBarraTopoItemAction(id: string): Promise<ActionResult> {
  try {
    await removerBarraTopoItem(id);
    revalidarTudo();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover" };
  }
}

export async function reordenarBarraTopoItensAction(ordemIds: string[]): Promise<ActionResult> {
  try {
    await reordenarBarraTopoItens(ordemIds);
    revalidarTudo();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reordenar" };
  }
}

export async function atualizarSeloConfiancaAction(id: string, ativo: boolean): Promise<ActionResult> {
  try {
    await atualizarSeloConfianca(id, ativo);
    revalidarTudo();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
