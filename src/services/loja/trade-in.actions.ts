"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

export async function criarTradeInAction(input: {
  nomeContato: string;
  telefoneContato: string;
  modeloAparelho: string;
  armazenamento?: string;
  condicaoRelatada?: string;
  observacoes?: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!input.nomeContato.trim() || !input.telefoneContato.trim() || !input.modeloAparelho.trim()) {
    return { success: false, error: "Preencha nome, telefone e modelo do aparelho" };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("solicitacoes_trade_in")
      .insert({
        nome_contato: input.nomeContato.trim(),
        telefone_contato: input.telefoneContato.replace(/\D/g, ""),
        modelo_aparelho: input.modeloAparelho.trim(),
        armazenamento: input.armazenamento || null,
        condicao_relatada: input.condicaoRelatada || null,
        observacoes: input.observacoes || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar solicitação" };
  }
}
