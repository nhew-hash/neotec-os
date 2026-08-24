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

async function criarPedidoParaCheckout(input: { nomeContato: string; telefoneContato: string; itens: ItemPedidoLojaInput[]; cupomCodigo?: string; usarCashback?: number; tipoEntrega?: "retirada" | "entrega"; regiaoEntrega?: string; valorFrete?: number }): Promise<{ pedidoId: string; valorTotal: number }> {
  const valorBruto = input.itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0);
  if (valorBruto <= 0) throw new Error("O valor do pedido está zerado — atualiza a página e tenta de novo.");

  const supabase = createAdminClient();

  // Confirma que cada item ainda está disponível de verdade — sem
  // isso, o cliente podia pagar por um aparelho que outra pessoa
  // acabou de comprar (item único, sem estoque múltiplo) ou por uma
  // quantidade de acessório que não existe mais. Roda ANTES de
  // qualquer cobrança, nunca depois.
  for (const item of input.itens) {
    if (item.tipo === "aparelho") {
      const { data: aparelho } = await supabase.from("aparelhos").select("status").eq("id", item.id).maybeSingle();
      if (!aparelho || aparelho.status !== "disponivel") {
        throw new Error(`"${item.nome}" acabou de ficar indisponível — alguém garantiu esse aparelho antes. Volta pro carrinho pra ver outras opções parecidas.`);
      }
    } else if (item.tipo === "produto") {
      const { data: saldo } = await supabase.from("vw_produtos_saldo").select("saldo").eq("produto_id", item.id).maybeSingle();
      if ((saldo?.saldo ?? 0) < item.quantidade) {
        throw new Error(`"${item.nome}" não tem mais estoque suficiente pra essa quantidade. Ajusta no carrinho e tenta de novo.`);
      }
    } else if (item.tipo === "lacrado") {
      const { data: variante } = await supabase.from("catalogo_lacrados_variantes").select("quantidade").eq("id", item.id).maybeSingle();
      if ((variante?.quantidade ?? 0) < item.quantidade) {
        throw new Error(`"${item.nome}" não tem mais estoque suficiente. Ajusta no carrinho e tenta de novo.`);
      }
    }
  }

  // Busca ou cria o cliente pelo telefone — sem isso, o pedido nunca
  // tem "dono" de verdade, e cashback/histórico de compra não têm pra
  // quem vincular.
  const telefoneLimpo = input.telefoneContato.replace(/\D/g, "");
  let clienteId: string | null = null;
  const { data: clienteExistente } = await supabase.from("clientes").select("id").eq("whatsapp", telefoneLimpo).maybeSingle();
  if (clienteExistente) {
    clienteId = clienteExistente.id;
  } else {
    const { data: novoCliente, error: erroCliente } = await supabase.from("clientes").insert({ nome: input.nomeContato.trim(), whatsapp: telefoneLimpo }).select("id").maybeSingle();
    if (erroCliente?.code === "23505") {
      // Corrida real — dois checkouts quase simultâneos do mesmo
      // telefone (duplo-clique, duas abas). Em vez de derrubar o
      // checkout, busca o cliente que a outra chamada acabou de criar.
      const { data: clienteDaCorrida } = await supabase.from("clientes").select("id").eq("whatsapp", telefoneLimpo).maybeSingle();
      clienteId = clienteDaCorrida?.id ?? null;
    } else {
      clienteId = novoCliente?.id ?? null;
    }
  }

  // Cupom sempre revalidado aqui, no servidor — nunca confia num
  // desconto que viesse pronto do navegador (poderia ser forjado).
  let valorTotal = valorBruto;
  let cupomId: string | null = null;
  if (input.cupomCodigo) {
    const { data: validacao } = await supabase.rpc("validar_cupom_publico", { p_codigo: input.cupomCodigo, p_valor_pedido: valorBruto });
    const linha = validacao?.[0];
    if (linha?.valido) {
      const desconto = linha.tipo_desconto === "percentual" ? valorBruto * (linha.valor / 100) : linha.tipo_desconto === "valor_fixo" ? Math.min(valorBruto, linha.valor) : 0;
      valorTotal = Math.max(0, valorTotal - desconto);
      const { data: cupom } = await supabase.from("cupons").select("id, usos").eq("codigo", input.cupomCodigo.toUpperCase()).maybeSingle();
      if (cupom) {
        cupomId = cupom.id;
        await supabase.from("cupons").update({ usos: cupom.usos + 1 }).eq("id", cupom.id);
      }
    }
  }

  // Resgate de cashback — sempre revalidado aqui contra o saldo real
  // do cliente, nunca confia no valor que veio do navegador.
  let cashbackUsado = 0;
  if (input.usarCashback && input.usarCashback > 0 && clienteId) {
    const { obterSaldoCashback } = await import("@/services/cashback/cashback.service");
    const saldoReal = await obterSaldoCashback(clienteId);
    cashbackUsado = Math.min(input.usarCashback, saldoReal, valorTotal);
    valorTotal = Math.max(0, valorTotal - cashbackUsado);
  }

  // Frete soma no total só depois de cupom/cashback já aplicados — o
  // valor do frete em si nunca entra na base de cálculo de desconto
  // percentual, só é somado no final.
  const valorFrete = input.valorFrete && input.valorFrete > 0 ? input.valorFrete : 0;
  valorTotal += valorFrete;

  const { data: pedido, error } = await supabase
    .from("pedidos_loja")
    .insert({
      cliente_id: clienteId, nome_contato: input.nomeContato.trim(), telefone_contato: telefoneLimpo, valor_total: valorTotal, origem_fechamento: "pagamento_online",
      tipo_entrega: input.tipoEntrega ?? "retirada", regiao_entrega: input.regiaoEntrega ?? null, valor_frete: valorFrete,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (cupomId) await supabase.from("cupom_usos").insert({ cupom_id: cupomId, pedido_id: pedido.id });

  // Debita o cashback usado JÁ na criação do pedido (não espera
  // aprovação) — evita o cliente conseguir "usar" o mesmo saldo em
  // dois pedidos simultâneos antes de qualquer um deles ser aprovado.
  // Se o pagamento cair, dá pra estornar manualmente (fica registrado
  // na transação com o pedido vinculado).
  if (cashbackUsado > 0 && clienteId) {
    const { registrarCashback } = await import("@/services/cashback/cashback.service");
    await registrarCashback({ cliente_id: clienteId, tipo: "debito", valor: cashbackUsado, origem: `Usado no pedido ${pedido.id.slice(0, 8)}` });
  }

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
  nomeContato: string; telefoneContato: string; itens: ItemPedidoLojaInput[]; cpf?: string; cupomCodigo?: string; usarCashback?: number;
  tipoEntrega?: "retirada" | "entrega"; regiaoEntrega?: string; valorFrete?: number;
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
  token: string; parcelas: number; metodoPagamentoId: string; cpf?: string; cupomCodigo?: string; usarCashback?: number;
  tipoEntrega?: "retirada" | "entrega"; regiaoEntrega?: string; valorFrete?: number;
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

/** Consulta o saldo de cashback pelo telefone — usado no checkout pra mostrar "você tem RX de saldo" antes de fechar a compra, sem exigir login. */
export async function consultarSaldoCashbackPorTelefoneAction(telefone: string): Promise<ActionResult<{ saldo: number }>> {
  try {
    const telefoneLimpo = telefone.replace(/\D/g, "");
    if (telefoneLimpo.length < 10) return { success: true, data: { saldo: 0 } };

    const supabase = createAdminClient();
    const { data: cliente } = await supabase.from("clientes").select("id").eq("whatsapp", telefoneLimpo).maybeSingle();
    if (!cliente) return { success: true, data: { saldo: 0 } };

    const { obterSaldoCashback } = await import("@/services/cashback/cashback.service");
    const saldo = await obterSaldoCashback(cliente.id);
    return { success: true, data: { saldo } };
  } catch {
    return { success: true, data: { saldo: 0 } }; // nunca trava o checkout por causa disso
  }
}
