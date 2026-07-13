import { createClient } from "@/lib/supabase/server";
import { obterCustoItem } from "@/services/estoque/estoque.service";
import type { Orcamento, Cliente, Venda } from "@/types";

export interface OrcamentoComCliente extends Orcamento {
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp">;
}

export async function listarOrcamentos(): Promise<OrcamentoComCliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .order("data_criacao", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar os orçamentos: ${error.message}`);
  return (data ?? []) as unknown as OrcamentoComCliente[];
}

export async function criarOrcamento(input: {
  cliente_id: string;
  usuario_id: string;
  produto_id?: string;
  aparelho_id?: string;
  valor: number;
  forma_pagamento?: string;
  garantia_dias?: number;
  validade?: string;
}): Promise<Orcamento> {
  const supabase = await createClient();

  const { data: orcamento, error } = await supabase
    .from("orcamentos")
    .insert({
      cliente_id: input.cliente_id,
      usuario_id: input.usuario_id,
      valor: input.valor,
      forma_pagamento: input.forma_pagamento || null,
      garantia_dias: input.garantia_dias ?? null,
      validade: input.validade || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar o orçamento: ${error.message}`);

  const { error: erroItem } = await supabase.from("orcamento_itens").insert({
    orcamento_id: orcamento.id,
    produto_id: input.produto_id || null,
    aparelho_id: input.aparelho_id || null,
    quantidade: 1,
    valor: input.valor,
  });

  if (erroItem) throw new Error(`Não foi possível registrar o item do orçamento: ${erroItem.message}`);

  return orcamento;
}

/**
 * Ao aprovar um orçamento: converte automaticamente em venda (regra da
 * Parte 1 da documentação). O custo real do item é obtido via RPC
 * (obterCustoItem), sem depender de o vendedor ter acesso à tabela de
 * custo — o lucro é calculado e gravado no servidor.
 */
export async function aprovarOrcamentoEConverterEmVenda(
  orcamentoId: string,
  usuarioId: string
): Promise<Venda> {
  const supabase = await createClient();

  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamentos")
    .select("*, itens:orcamento_itens(*)")
    .eq("id", orcamentoId)
    .single();

  if (erroOrcamento || !orcamento) {
    throw new Error("Orçamento não encontrado");
  }

  const item = orcamento.itens?.[0];
  if (!item) throw new Error("Orçamento sem item associado");

  const custo = await obterCustoItem({
    produtoId: item.produto_id ?? undefined,
    aparelhoId: item.aparelho_id ?? undefined,
  });

  const lucro = Number(orcamento.valor) - custo;

  const { data: venda, error: erroVenda } = await supabase
    .from("vendas")
    .insert({
      cliente_id: orcamento.cliente_id,
      usuario_id: usuarioId,
      orcamento_id: orcamento.id,
      valor_total: orcamento.valor,
      lucro,
      forma_pagamento: orcamento.forma_pagamento ?? "pix",
      status: "concluida",
    })
    .select("*")
    .single();

  if (erroVenda) throw new Error(`Não foi possível gerar a venda: ${erroVenda.message}`);

  await supabase.from("venda_itens").insert({
    venda_id: venda.id,
    produto_id: item.produto_id,
    aparelho_id: item.aparelho_id,
    quantidade: item.quantidade,
    valor: item.valor,
    custo,
  });

  // Aparelho vendido sai do estoque disponível
  if (item.aparelho_id) {
    await supabase.from("aparelhos").update({ status: "vendido" }).eq("id", item.aparelho_id);
    await supabase.from("movimentos_estoque").insert({
      aparelho_id: item.aparelho_id,
      tipo: "saida",
      motivo: `Venda #${venda.id.slice(0, 8)}`,
      usuario_id: usuarioId,
    });
  }
  if (item.produto_id) {
    await supabase.from("movimentos_estoque").insert({
      produto_id: item.produto_id,
      tipo: "saida",
      quantidade: item.quantidade,
      motivo: `Venda #${venda.id.slice(0, 8)}`,
      usuario_id: usuarioId,
    });
  }

  // Lançamento financeiro automático (evita o backfill que identificamos
  // no plano de fases — o dado é capturado desde já). Usa RPC porque
  // quem aprova o orçamento pode ser vendedor, sem acesso direto a `financeiro`.
  await supabase.rpc("registrar_lancamento_financeiro", {
    p_tipo: "entrada",
    p_categoria: "Venda",
    p_valor: venda.valor_total,
    p_origem_tipo: "venda",
    p_origem_id: venda.id,
    p_usuario_id: usuarioId,
  });

  await supabase.from("orcamentos").update({ status: "aprovado" }).eq("id", orcamentoId);

  // Garantia automática, se o orçamento definiu um prazo
  if (orcamento.garantia_dias) {
    const fim = new Date();
    fim.setDate(fim.getDate() + orcamento.garantia_dias);
    await supabase.from("garantias").insert({
      cliente_id: orcamento.cliente_id,
      aparelho_id: item.aparelho_id,
      venda_id: venda.id,
      tipo: "produto",
      inicio: new Date().toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    });
  }

  return venda;
}

export async function listarVendas(): Promise<(Venda & { cliente: Pick<Cliente, "id" | "nome"> | null })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_vendas_seguro")
    .select("*, cliente:clientes(id, nome)")
    .order("data_venda", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as vendas: ${error.message}`);
  return (data ?? []) as unknown as (Venda & { cliente: Pick<Cliente, "id" | "nome"> | null })[];
}

export async function buscarVendaPorId(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_vendas_seguro")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Não foi possível carregar a venda: ${error.message}`);
  }
  return data;
}

export async function atualizarChecklistEntrega(
  vendaId: string,
  checklist: {
    checklist_aparelho_conferido: boolean;
    checklist_acessorios_recebidos: boolean;
    checklist_garantia_entregue: boolean;
    checklist_cliente_confirmou: boolean;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_checklist_venda", {
    p_venda_id: vendaId,
    p_aparelho_conferido: checklist.checklist_aparelho_conferido,
    p_acessorios_recebidos: checklist.checklist_acessorios_recebidos,
    p_garantia_entregue: checklist.checklist_garantia_entregue,
    p_cliente_confirmou: checklist.checklist_cliente_confirmou,
  });
  if (error) throw new Error(`Não foi possível atualizar o checklist: ${error.message}`);
}
