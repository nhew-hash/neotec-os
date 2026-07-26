"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { paymentService } from "./payment.service";
import { paymentRepository } from "./payment.repository";
import { extrairMensagemErro } from "./erro.utils";
import type { ActionResult } from "@/types";
import type { ItemPedidoLojaInput } from "@/services/loja/loja-pedido.actions";

/**
 * PaymentController — a única camada que o React (via Server Action)
 * chama. Nunca contém lógica de pagamento em si, só valida entrada e
 * delega pro PaymentService — mantém a regra de "nunca lógica de
 * pagamento dentro de componente".
 */

async function criarPedidoParaCheckout(input: { nomeContato: string; telefoneContato: string; itens: ItemPedidoLojaInput[] }): Promise<{ pedidoId: string; valorTotal: number }> {
  const valorTotal = input.itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0);
  if (valorTotal <= 0) throw new Error("O valor do pedido está zerado — atualiza a página e tenta de novo.");

  const supabase = createAdminClient();

  const { data: pedido, error } = await supabase
    .from("pedidos_loja")
    .insert({ nome_contato: input.nomeContato.trim(), telefone_contato: input.telefoneContato.replace(/\D/g, ""), valor_total: valorTotal, origem_fechamento: "pagamento_online" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: erroItens } = await supabase.from("pedido_loja_itens").insert(
    input.itens.map((item) => ({
      pedido_id: pedido.id,
      produto_id: item.tipo === "produto" ? item.id : null,
      aparelho_id: item.tipo === "aparelho" ? item.id : null,
      lacrado_variante_id: item.tipo === "lacrado" ? item.id : null,
      nome_exibido: item.nome,
      quantidade: item.quantidade,
      valor: item.valor,
    }))
  );
  if (erroItens) throw new Error(erroItens.message);

  return { pedidoId: pedido.id, valorTotal };
}

export async function iniciarCheckoutPixAction(input: {
  nomeContato: string; telefoneContato: string; itens: ItemPedidoLojaInput[]; cpf?: string;
}): Promise<ActionResult<{ pedidoId: string; pagamentoId: string; qrCodeBase64: string | null; copiaCola: string | null; expiraEm: string | null }>> {
  if (!input.nomeContato.trim() || !input.telefoneContato.trim()) return { success: false, error: "Informe nome e telefone" };
  if (input.itens.length === 0) return { success: false, error: "Carrinho vazio" };

  try {
    const { pedidoId, valorTotal } = await criarPedidoParaCheckout(input);
    const resultado = await paymentService.iniciarPagamentoPix({ pedidoId, valor: valorTotal, descricao: `Pedido Neotec #${pedidoId.slice(0, 8)}`, cpf: input.cpf });
    return { success: true, data: { pedidoId, pagamentoId: resultado.pagamentoId, qrCodeBase64: resultado.qrCodeBase64, copiaCola: resultado.copiaCola, expiraEm: resultado.expiraEm } };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Erro ao gerar Pix") };
  }
}

export async function pagarComCartaoAction(input: {
  nomeContato: string; telefoneContato: string; itens: ItemPedidoLojaInput[];
  token: string; parcelas: number; metodoPagamentoId: string; cpf?: string;
}): Promise<ActionResult<{ pedidoId: string; status: string; statusDetail: string | null }>> {
  if (!input.nomeContato.trim() || !input.telefoneContato.trim()) return { success: false, error: "Informe nome e telefone" };
  if (input.itens.length === 0) return { success: false, error: "Carrinho vazio" };

  try {
    const { pedidoId, valorTotal } = await criarPedidoParaCheckout(input);
    const resultado = await paymentService.pagarComCartao({
      pedidoId, valor: valorTotal, descricao: `Pedido Neotec #${pedidoId.slice(0, 8)}`,
      token: input.token, parcelas: input.parcelas, metodoPagamentoId: input.metodoPagamentoId, cpf: input.cpf,
    });
    return { success: true, data: { pedidoId, status: resultado.status, statusDetail: resultado.statusDetail } };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Erro ao processar cartão") };
  }
}

export async function consultarStatusPagamentoAction(pagamentoId: string): Promise<ActionResult<{ status: string }>> {
  try {
    const pagamento = await paymentService.consultarStatusAtual(pagamentoId);
    if (!pagamento) return { success: false, error: "Pagamento não encontrado" };
    return { success: true, data: { status: pagamento.status } };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Erro ao consultar status") };
  }
}

/** Devolve a Public Key pro front carregar o SDK JS do Mercado Pago — nunca o Access Token, esse fica só no servidor. */
export async function buscarPublicKeyMercadoPagoAction(): Promise<ActionResult<{ publicKey: string | null; ativo: boolean }>> {
  try {
    const config = await paymentRepository.buscarConfiguracao("mercadopago", false);
    return { success: true, data: { publicKey: config?.public_key ?? null, ativo: config?.ativo ?? false } };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Erro ao carregar configuração") };
  }
}

export interface OpcaoParcela {
  parcelas: number;
  valorParcela: number;
  valorTotal: number;
  temJuros: boolean;
  taxaJuros: number;
}

/** Tabela de parcelamento real (juros incluído quando existir) — cache de 1h dentro do PaymentService/Provider. */
export async function buscarTabelaParcelasAction(valor: number): Promise<ActionResult<{ opcoes: OpcaoParcela[] }>> {
  if (valor <= 0) return { success: false, error: "Valor inválido" };
  try {
    const opcoes = await paymentService.consultarTabelaParcelas(valor);
    return { success: true, data: { opcoes } };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Não foi possível consultar as parcelas agora") };
  }
}
