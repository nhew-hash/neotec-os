import { createClient } from "@/lib/supabase/server";
import { obterCustoItem } from "@/services/estoque/estoque.service";
import { obterSaldoCashback, registrarCashback } from "@/services/cashback/cashback.service";
import type { PdvVendaValues } from "./pdv.schema";
import type { Venda } from "@/types";

/**
 * Checkout do PDV rápido — venda de balcão, com carrinho de múltiplos
 * itens (aparelho e/ou produto simples misturados) e cliente opcional
 * (venda avulsa). Reaproveita o mesmo padrão de efeitos colaterais já
 * usado em `aprovarOrcamentoEConverterEmVenda` (baixa estoque, gera
 * financeiro, gera garantia se aplicável) — só que pra N itens de uma
 * vez, não 1.
 */
export async function criarVendaPDV(input: PdvVendaValues, usuarioId: string): Promise<Venda> {
  const supabase = await createClient();

  // Valida o cashback usado contra o saldo real do cliente — nunca
  // confia só no que veio do formulário (alguém poderia mandar um
  // valor maior do que realmente tem de saldo).
  if (input.cashback_utilizado > 0) {
    if (!input.cliente_id) throw new Error("Cashback só pode ser usado com um cliente selecionado");
    const saldoAtual = await obterSaldoCashback(input.cliente_id);
    if (input.cashback_utilizado > saldoAtual) {
      throw new Error(`Cliente só tem ${saldoAtual.toFixed(2)} de cashback disponível`);
    }
  }

  // Custo real de cada item, via RPC — igual à venda por orçamento, o
  // vendedor nunca precisa ter acesso de leitura ao custo pra isso funcionar.
  const itensComCusto = await Promise.all(
    input.itens.map(async (item) => ({
      ...item,
      custo: await obterCustoItem({
        produtoId: item.tipo === "produto" ? item.id : undefined,
        aparelhoId: item.tipo === "aparelho" ? item.id : undefined,
      }),
    }))
  );

  const valorBruto = itensComCusto.reduce((acc, i) => acc + i.valor * i.quantidade, 0);
  const valorTotal = Math.max(0, valorBruto - (input.desconto ?? 0) - input.cashback_utilizado);
  const custoTotal = itensComCusto.reduce((acc, i) => acc + i.custo * i.quantidade, 0);
  const lucro = valorTotal - custoTotal;

  const { data: venda, error: erroVenda } = await supabase
    .from("vendas")
    .insert({
      cliente_id: input.cliente_id || null,
      usuario_id: usuarioId,
      valor_total: valorTotal,
      desconto: input.desconto ?? 0,
      lucro,
      forma_pagamento: input.forma_pagamento,
      status: "concluida",
      indicador_id: input.indicador_id || null,
      cashback_utilizado: input.cashback_utilizado,
      cashback_concedido: input.cashback_concedido,
    })
    .select("*")
    .single();

  if (erroVenda) throw new Error(`Não foi possível registrar a venda: ${erroVenda.message}`);

  // Movimentos de cashback — débito do que foi usado, crédito do que
  // foi concedido nessa compra. Só faz sentido com cliente identificado.
  if (input.cliente_id) {
    if (input.cashback_utilizado > 0) {
      await registrarCashback({ cliente_id: input.cliente_id, tipo: "debito", valor: input.cashback_utilizado, origem: `Usado na venda #${venda.id.slice(0, 8)}` });
    }
    if (input.cashback_concedido > 0) {
      await registrarCashback({ cliente_id: input.cliente_id, tipo: "credito", valor: input.cashback_concedido, origem: `Concedido na venda #${venda.id.slice(0, 8)}` });
    }
  }

  for (const item of itensComCusto) {
    await supabase.from("venda_itens").insert({
      venda_id: venda.id,
      produto_id: item.tipo === "produto" ? item.id : null,
      aparelho_id: item.tipo === "aparelho" ? item.id : null,
      quantidade: item.quantidade,
      valor: item.valor,
      custo: item.custo,
    });

    if (item.tipo === "aparelho") {
      await supabase.from("aparelhos").update({ status: "vendido" }).eq("id", item.id);
      await supabase.from("movimentos_estoque").insert({
        aparelho_id: item.id,
        tipo: "saida",
        motivo: `Venda #${venda.id.slice(0, 8)}`,
        usuario_id: usuarioId,
      });
    } else {
      await supabase.from("movimentos_estoque").insert({
        produto_id: item.id,
        tipo: "saida",
        quantidade: item.quantidade,
        motivo: `Venda #${venda.id.slice(0, 8)}`,
        usuario_id: usuarioId,
      });
    }
  }

  await supabase.rpc("registrar_lancamento_financeiro", {
    p_tipo: "entrada",
    p_categoria: "Venda",
    p_valor: valorTotal,
    p_origem_tipo: "venda",
    p_origem_id: venda.id,
    p_usuario_id: usuarioId,
  });

  // Garantia automática só faz sentido com cliente identificado — venda
  // avulsa sem cliente não tem pra quem a garantia valer.
  if (input.garantia_dias && input.cliente_id) {
    const aparelhoPrincipal = itensComCusto.find((i) => i.tipo === "aparelho");
    const fim = new Date();
    fim.setDate(fim.getDate() + input.garantia_dias);
    await supabase.from("garantias").insert({
      cliente_id: input.cliente_id,
      aparelho_id: aparelhoPrincipal?.id ?? null,
      venda_id: venda.id,
      tipo: "produto",
      inicio: new Date().toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    });
  }

  return venda;
}
