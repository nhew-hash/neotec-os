import { createClient } from "@/lib/supabase/server";
import type { PedidoLoja, PedidoLojaItem, StatusPedidoLoja } from "@/types";

export interface PedidoLojaComItens extends PedidoLoja {
  itens: PedidoLojaItem[];
}

export async function listarPedidosLoja(): Promise<PedidoLojaComItens[]> {
  const supabase = await createClient();
  const { data: pedidos, error } = await supabase.from("pedidos_loja").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os pedidos: ${error.message}`);

  const { data: itens } = await supabase.from("pedido_loja_itens").select("*");

  return (pedidos ?? []).map((p) => ({ ...p, itens: (itens ?? []).filter((i) => i.pedido_id === p.id) }));
}

export async function atualizarStatusPedidoLoja(id: string, status: StatusPedidoLoja): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos_loja").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o pedido: ${error.message}`);
}
