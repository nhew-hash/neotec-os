"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

export interface ItemPedidoLojaInput {
  tipo: "produto" | "aparelho";
  id: string;
  nome: string;
  quantidade: number;
  valor: number;
}

/**
 * "use server" — roda sempre no servidor, mesmo chamada a partir de um
 * componente de cliente na loja pública. O Service Role Key nunca sai
 * daqui, nunca vai pro navegador.
 */
export async function criarPedidoLojaAction(input: {
  nomeContato: string;
  telefoneContato: string;
  itens: ItemPedidoLojaInput[];
  origemFechamento: "whatsapp" | "pagamento_online";
}): Promise<ActionResult<{ pedidoId: string }>> {
  if (!input.nomeContato.trim() || !input.telefoneContato.trim()) {
    return { success: false, error: "Informe nome e telefone" };
  }
  if (input.itens.length === 0) {
    return { success: false, error: "Carrinho vazio" };
  }

  try {
    const supabase = createAdminClient();
    const valorTotal = input.itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0);

    const { data: pedido, error } = await supabase
      .from("pedidos_loja")
      .insert({
        nome_contato: input.nomeContato.trim(),
        telefone_contato: input.telefoneContato.replace(/\D/g, ""),
        valor_total: valorTotal,
        origem_fechamento: input.origemFechamento,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const { error: erroItens } = await supabase.from("pedido_loja_itens").insert(
      input.itens.map((item) => ({
        pedido_id: pedido.id,
        produto_id: item.tipo === "produto" ? item.id : null,
        aparelho_id: item.tipo === "aparelho" ? item.id : null,
        nome_exibido: item.nome,
        quantidade: item.quantidade,
        valor: item.valor,
      }))
    );
    if (erroItens) throw new Error(erroItens.message);

    return { success: true, data: { pedidoId: pedido.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar pedido" };
  }
}
