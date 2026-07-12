"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { retornoSchema } from "./crm.schema";
import { moverConversaEtapa, criarRetorno, concluirRetorno } from "./crm.service";
import type { ActionResult, EtapaFunil } from "@/types";

export async function moverConversaEtapaAction(
  conversaId: string,
  etapa: EtapaFunil
): Promise<ActionResult> {
  try {
    await moverConversaEtapa(conversaId, etapa);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao mover o lead";
    return { success: false, error: message };
  }
}

export async function criarRetornoAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    data_retorno: String(formData.get("data_retorno") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  };

  const parsed = retornoSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    await criarRetorno({ ...parsed.data, usuario_id: user.id });
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao agendar retorno";
    return { success: false, error: message };
  }
}

export async function concluirRetornoAction(id: string): Promise<ActionResult> {
  try {
    await concluirRetorno(id);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao concluir retorno";
    return { success: false, error: message };
  }
}
