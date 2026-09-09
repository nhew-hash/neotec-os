import { createClient } from "@/lib/supabase/server";
import type { SolicitacaoTradeIn, StatusTradeIn } from "@/types";

export async function listarSolicitacoesTradeIn(): Promise<SolicitacaoTradeIn[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("solicitacoes_trade_in").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar as solicitações: ${error.message}`);
  return data ?? [];
}

export async function atualizarStatusTradeIn(id: string, status: StatusTradeIn): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("solicitacoes_trade_in").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar: ${error.message}`);
}
