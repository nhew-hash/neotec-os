import { createAdminClient } from "@/lib/supabase/admin";
import { MercadoPagoProvider } from "./providers/mercadopago.provider";
import { paymentRepository, STATUS_PAGAMENTO_PARA_PEDIDO } from "./payment.repository";
import type { StatusPagamento, Pagamento } from "@/types";

const EMAIL_PADRAO = "cliente@neotecbrasil.com"; // Mercado Pago exige e-mail no payer; checkout hoje não coleta e-mail do cliente

function mapearStatusMP(statusMP: string): StatusPagamento {
  const mapa: Record<string, StatusPagamento> = {
    approved: "aprovado",
    pending: "pendente",
    in_process: "pendente",
    rejected: "recusado",
    cancelled: "cancelado",
    refunded: "estornado",
    charged_back: "chargeback",
  };
  return mapa[statusMP] ?? "pendente";
}

/**
 * PaymentService — orquestra Provider + Repository. Nenhum componente
 * React ou rota chama o MercadoPagoProvider direto; sempre passa por
 * aqui, o que deixa a troca/adição de gateway futura isolada nesta
 * classe (o resto do app só conhece PaymentService).
 */
export class PaymentService {
  /**
   * Tabela de parcelamento real — cache de 1h via Next.js `fetch`
   * (o próprio provider usa fetch nativo, que o Next intercepta e
   * cacheia automaticamente pela `next.revalidate`). Não é "ao vivo"
   * no sentido de bater na API a cada clique, mas nunca fica
   * desatualizado por mais de 1h — taxa de juros não muda de minuto a
   * minuto, então esse intervalo é seguro sem sobrecarregar a API.
   */
  async consultarTabelaParcelas(valor: number) {
    const { provider } = await this.obterProvider();
    return provider.buscarTabelaParcelas(valor);
  }

  private async obterProvider(): Promise<{ provider: MercadoPagoProvider; publicKey: string | null }> {
    const config = await paymentRepository.buscarConfiguracao("mercadopago", false);
    if (!config?.access_token) throw new Error("Mercado Pago não está configurado — defina o Access Token em Configurações → Pagamentos.");
    if (!config.ativo) throw new Error("Pagamento online está desativado em Configurações → Pagamentos.");
    return { provider: new MercadoPagoProvider(config.access_token), publicKey: config.public_key };
  }

  async iniciarPagamentoPix(input: { pedidoId: string; valor: number; descricao: string; cpf?: string }) {
    const { provider } = await this.obterProvider();
    const pagamento = await paymentRepository.criarPagamento({ pedidoId: input.pedidoId, gateway: "mercadopago", valor: input.valor, tipoPagamento: "pix" });

    const resultado = await provider.criarPagamentoPix({
      valor: input.valor,
      descricao: input.descricao,
      email: EMAIL_PADRAO,
      cpf: input.cpf,
      externalReference: pagamento.id, // referencia o ID interno do pagamento, não o pedido — permite reprocessar pagamento sem ambiguidade se o cliente tentar de novo
    });

    await paymentRepository.atualizarPagamento(pagamento.id, {
      payment_id: resultado.paymentId,
      status: mapearStatusMP(resultado.status),
      pix_qrcode: resultado.qrCodeBase64,
      pix_copia_cola: resultado.copiaCola,
      pix_expira_em: resultado.expiraEm,
    });

    return { pagamentoId: pagamento.id, qrCodeBase64: resultado.qrCodeBase64, copiaCola: resultado.copiaCola, expiraEm: resultado.expiraEm };
  }

  async pagarComCartao(input: { pedidoId: string; valor: number; descricao: string; token: string; parcelas: number; metodoPagamentoId: string; cpf?: string }) {
    const { provider } = await this.obterProvider();
    const pagamento = await paymentRepository.criarPagamento({
      pedidoId: input.pedidoId, gateway: "mercadopago", valor: input.valor, tipoPagamento: "cartao_credito", parcelas: input.parcelas,
    });

    const resultado = await provider.criarPagamentoCartao({
      token: input.token,
      valor: input.valor,
      descricao: input.descricao,
      email: EMAIL_PADRAO,
      cpf: input.cpf,
      parcelas: input.parcelas,
      metodoPagamentoId: input.metodoPagamentoId,
      externalReference: pagamento.id,
    });

    const status = mapearStatusMP(resultado.status);
    await paymentRepository.atualizarPagamento(pagamento.id, { payment_id: resultado.paymentId, status });

    if (status === "aprovado") await this.processarPagamentoAprovado(pagamento.id);

    return { pagamentoId: pagamento.id, status, statusDetail: resultado.statusDetail };
  }

  /** Consultada pelo checkout via polling — nunca confia no que ficou salvo antes sem confirmar de novo se ainda está "pendente" (Pix pode ter sido pago no intervalo). */
  async consultarStatusAtual(pagamentoId: string): Promise<Pagamento | null> {
    const pagamento = await paymentRepository.buscarPorId(pagamentoId);
    if (!pagamento || pagamento.status !== "pendente" || !pagamento.payment_id) return pagamento;

    const { provider } = await this.obterProvider();
    const statusReal = await provider.buscarPagamento(pagamento.payment_id);
    const novoStatus = mapearStatusMP(statusReal.status);

    if (novoStatus !== pagamento.status) {
      await paymentRepository.atualizarPagamento(pagamento.id, {
        status: novoStatus, valor_liquido: statusReal.valorLiquido, taxa_gateway: statusReal.taxaGateway,
      });
      if (novoStatus === "aprovado") await this.processarPagamentoAprovado(pagamento.id);
    }

    return paymentRepository.buscarPorId(pagamentoId);
  }

  /** Chamado pelo WebhookService com o status JÁ confirmado direto na API do gateway. */
  async processarNotificacaoWebhook(paymentIdExterno: string, statusMP: string): Promise<void> {
    const pagamento = await paymentRepository.buscarPorPaymentIdExterno(paymentIdExterno, "mercadopago");
    if (!pagamento) return; // notificação de um pagamento que não foi criado por essa loja — ignora

    const novoStatus = mapearStatusMP(statusMP);
    if (novoStatus === pagamento.status) return; // já processado, evita duplicar a automação de aprovação

    await paymentRepository.atualizarPagamento(pagamento.id, { status: novoStatus });
    if (novoStatus === "aprovado") await this.processarPagamentoAprovado(pagamento.id);
  }

  /**
   * A automação completa quando um pagamento é aprovado — baixa
   * estoque, cria venda de verdade (aparece em Vendas/relatórios/
   * financeiro como qualquer outra), avisa o cliente no WhatsApp.
   * Idempotente: se rodar duas vezes pro mesmo pagamento (retry de
   * webhook, por exemplo), a segunda vez não duplica nada porque o
   * pedido já está "concluido" e a checagem de status muda isso.
   */
  private async processarPagamentoAprovado(pagamentoId: string): Promise<void> {
    const pagamento = await paymentRepository.buscarPorId(pagamentoId);
    if (!pagamento) return;

    const supabase = createAdminClient();
    const { data: pedido } = await supabase.from("pedidos_loja").select("*").eq("id", pagamento.pedido_id).maybeSingle();
    if (!pedido || pedido.status === "concluido") return; // já processado — evita duplicar

    const { data: itensPedido } = await supabase.from("pedido_loja_itens").select("*").eq("pedido_id", pedido.id);

    // Baixa estoque real — aparelho vira "vendido", variante de lacrado desconta a quantidade.
    for (const item of itensPedido ?? []) {
      if (item.aparelho_id) {
        await supabase.from("aparelhos").update({ status: "vendido" }).eq("id", item.aparelho_id);
      }
      if (item.lacrado_variante_id) {
        const { data: variante } = await supabase.from("catalogo_lacrados_variantes").select("quantidade").eq("id", item.lacrado_variante_id).maybeSingle();
        if (variante) {
          await supabase.from("catalogo_lacrados_variantes").update({ quantidade: Math.max(0, variante.quantidade - item.quantidade) }).eq("id", item.lacrado_variante_id);
        }
      }
    }

    // Cria a venda de verdade — mesma tabela que qualquer venda da loja física, aparece nos relatórios normalmente.
    const { data: venda } = await supabase
      .from("vendas")
      .insert({ valor_total: pedido.valor_total, forma_pagamento: pagamento.tipo_pagamento ?? "pix", status: "concluida" })
      .select("id")
      .single();

    if (venda) {
      for (const item of itensPedido ?? []) {
        let custo = 0;
        if (item.aparelho_id) {
          const { data: aparelho } = await supabase.from("aparelhos").select("custo").eq("id", item.aparelho_id).maybeSingle();
          custo = aparelho?.custo ?? 0;
        } else if (item.produto_id) {
          const { data: produto } = await supabase.from("produtos").select("custo").eq("id", item.produto_id).maybeSingle();
          custo = produto?.custo ?? 0;
        }
        // Lacrado ainda não tem custo por variante no catálogo mestre — lucro desse item específico fica em aberto no relatório até isso existir.

        await supabase.from("venda_itens").insert({
          venda_id: venda.id, produto_id: item.produto_id, aparelho_id: item.aparelho_id,
          quantidade: item.quantidade, valor: item.valor, custo,
        });
      }

      await supabase.rpc("registrar_lancamento_financeiro", {
        p_tipo: "entrada", p_categoria: "Venda", p_valor: pedido.valor_total,
        p_origem_tipo: "venda", p_origem_id: venda.id, p_usuario_id: null,
      });

      // Avisa a equipe por WhatsApp que entrou pedido novo — melhor
      // esforço, nunca derruba a aprovação do pagamento se falhar.
      try {
        const { data: config } = await supabase.from("configuracoes_precificacao").select("whatsapp_notificacao_staff").limit(1).maybeSingle();
        if (config?.whatsapp_notificacao_staff) {
          const { getActiveProvider } = await import("@/services/whatsapp/providers/provider-resolver");
          const { paraFormatoInternacionalBR } = await import("@/utils/telefone");
          const provider = await getActiveProvider();
          const resultadoEnvio = await provider.enviarTexto(
            paraFormatoInternacionalBR(config.whatsapp_notificacao_staff),
            `🛒 *Novo pedido* aprovado na loja!\n\n*Cliente:* ${pedido.nome_contato}\n*Telefone:* ${pedido.telefone_contato}\n*Valor:* ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pedido.valor_total)}`
          );
          if (!resultadoEnvio.enviado) {
            console.error("WhatsApp de pedido novo não foi entregue:", resultadoEnvio.motivo);
          }
        }
      } catch (erroWhatsapp) {
        console.error("Falha ao notificar staff sobre pedido novo (não bloqueia a venda):", erroWhatsapp);
      }

      // Cashback — checkout online nunca creditava isso antes, só o
      // PDV manual fazia. Pedido sem cliente vinculado (guest
      // checkout) simplesmente não tem pra quem creditar, segue sem erro.
      if (pedido.cliente_id) {
        try {
          const { registrarCashback } = await import("@/services/cashback/cashback.service");

          for (const item of itensPedido ?? []) {
            const { data: percentual } = await supabase.rpc("obter_percentual_cashback_publico", {
              p_produto_id: item.produto_id, p_aparelho_id: item.aparelho_id,
            });
            const valorCashback = Math.round(item.valor * item.quantidade * ((percentual ?? 1.5) / 100) * 100) / 100;
            if (valorCashback > 0) {
              await registrarCashback({ cliente_id: pedido.cliente_id, tipo: "credito", valor: valorCashback, origem: `Compra online — pedido ${pedido.id.slice(0, 8)}` });
            }
          }

          // Cupom tipo "cashback" usado nesse pedido — credita o valor
          // fixo do cupom também, além do cashback normal por item.
          const { data: usoCupom } = await supabase
            .from("cupom_usos")
            .select("cupom:cupons(codigo, tipo_desconto, valor)")
            .eq("pedido_id", pedido.id)
            .maybeSingle();
          const cupomUsado = usoCupom?.cupom as unknown as { codigo: string; tipo_desconto: string; valor: number } | null;
          if (cupomUsado?.tipo_desconto === "cashback" && cupomUsado.valor > 0) {
            await registrarCashback({ cliente_id: pedido.cliente_id, tipo: "credito", valor: cupomUsado.valor, origem: `Cupom ${cupomUsado.codigo}` });
          }
        } catch (erroCashback) {
          // Nunca derruba a aprovação do pagamento por causa disso — cliente ainda recebe o produto normalmente, só não ganha cashback dessa vez.
          console.error("Falha ao creditar cashback (não bloqueia a venda):", erroCashback);
        }
      }
    }

    await supabase.from("pedidos_loja").update({ status: "concluido" }).eq("id", pedido.id);
    await paymentRepository.registrarPagamentoAprovado("mercadopago");

    // Confirmação por WhatsApp — melhor esforço, não derruba a aprovação do pagamento se falhar.
    // Usa o provider direto (não enviarMensagem/enviarMensagemIA) porque
    // essas exigem uma conversa já existente no CRM — o cliente pode
    // ter comprado pela loja sem nunca ter mandado mensagem antes.
    try {
      const { getActiveProvider } = await import("@/services/whatsapp/providers/provider-resolver");
      const { paraFormatoInternacionalBR } = await import("@/utils/telefone");
      const provider = await getActiveProvider();
      await provider.enviarTexto(
        paraFormatoInternacionalBR(pedido.telefone_contato),
        `Recebemos seu pagamento! ✅\n\nPedido #${pedido.id.slice(0, 8)} confirmado — ${pedido.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.\n\nJá vamos preparar tudo. Qualquer dúvida, é só chamar por aqui.`
      );
    } catch {
      // Falha no envio de WhatsApp não deve reverter o pagamento já aprovado — só fica sem a notificação automática dessa vez.
    }
  }
}

export const paymentService = new PaymentService();
export { STATUS_PAGAMENTO_PARA_PEDIDO };
