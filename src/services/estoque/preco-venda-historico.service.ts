import { createClient } from "@/lib/supabase/server";
import type { PrecoVendaHistorico } from "@/types";

/** Fase 257 — últimas alterações de preço de um produto/aparelho, mais recente primeiro. */
export async function listarHistoricoPreco(entidade: "produto" | "aparelho", entidadeId: string, limite = 10): Promise<PrecoVendaHistorico[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preco_venda_historico")
    .select("*")
    .eq("entidade", entidade)
    .eq("entidade_id", entidadeId)
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Não foi possível carregar o histórico de preço: ${error.message}`);
  return data ?? [];
}
