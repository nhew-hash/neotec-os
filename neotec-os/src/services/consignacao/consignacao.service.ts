import { createClient } from "@/lib/supabase/server";
import type { Consignacao, Cliente, StatusConsignacao } from "@/types";

export interface ConsignacaoComDetalhes extends Consignacao {
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp">;
  lucro: number | null;
  valor_venda: number | null;
}

export async function listarConsignacoes(): Promise<ConsignacaoComDetalhes[]> {
  const supabase = await createClient();
  const { data: consignacoes, error } = await supabase
    .from("consignacoes")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as consignações: ${error.message}`);

  const { data: resumos } = await supabase.from("vw_consignacao_resumo").select("*");
  const resumoPorId = new Map((resumos ?? []).map((r) => [r.consignacao_id, r]));

  return ((consignacoes ?? []) as unknown as ConsignacaoComDetalhes[]).map((c) => ({
    ...c,
    lucro: resumoPorId.get(c.id)?.lucro ?? null,
    valor_venda: resumoPorId.get(c.id)?.valor_venda ?? null,
  }));
}

export async function criarConsignacao(input: {
  cliente_id: string;
  aparelho_id: string;
  valor_combinado: number;
  prazo?: string;
}): Promise<Consignacao> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consignacoes")
    .insert({
      cliente_id: input.cliente_id,
      aparelho_id: input.aparelho_id,
      valor_combinado: input.valor_combinado,
      prazo: input.prazo || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar a consignação: ${error.message}`);

  // Vincula o aparelho a esta consignação e marca a origem de entrada
  await supabase.from("aparelhos").update({
    consignacao_id: data.id,
    origem_entrada: "consignacao",
  }).eq("id", input.aparelho_id);

  return data;
}

export async function atualizarStatusConsignacao(id: string, status: StatusConsignacao): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("consignacoes").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar a consignação: ${error.message}`);
}
