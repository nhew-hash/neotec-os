import { MercadoPagoProvider } from "@/services/pagamentos/providers/mercadopago.provider";
import { paymentRepository } from "@/services/pagamentos/payment.repository";
import type { CrediarioPaymentProvider } from "./payment-provider.types";

/**
 * Reaproveita a MESMA classe MercadoPagoProvider já usada no checkout
 * da loja (e a mesma configuração salva em Configurações →
 * Pagamentos) — nunca duplica integração. Boleto não é suportado
 * nativamente aqui ainda (Mercado Pago faz, mas não implementado
 * nesse provider ainda); Pix sim, de verdade.
 */
export class MercadoPagoCrediarioProvider implements CrediarioPaymentProvider {
  async gerarBoleto(): Promise<{ idExterno: string; boletoUrl: string; linhaDigitavel: string }> {
    throw new Error("Boleto ainda não implementado nesse provider — só Pix por enquanto. Usa Pix ou implementa o provider de boleto.");
  }

  async gerarPix(input: { parcelaId: string; valor: number; nomeCliente: string }): Promise<{ idExterno: string; copiaCola: string; qrCodeBase64: string | null }> {
    const config = await paymentRepository.buscarConfiguracao("mercadopago", false);
    if (!config?.access_token) throw new Error("Mercado Pago não configurado — defina em Configurações → Pagamentos.");

    const provider = new MercadoPagoProvider(config.access_token);
    const resultado = await provider.criarPagamentoPix({
      valor: input.valor, descricao: `Parcela crediário — ${input.nomeCliente}`,
      email: "cobranca@neotec.com.br", externalReference: input.parcelaId,
    });

    return { idExterno: resultado.paymentId, copiaCola: resultado.copiaCola ?? "", qrCodeBase64: resultado.qrCodeBase64 };
  }

  async consultarStatus(): Promise<{ status: "pendente" | "confirmado" | "falhou" | "estornado" }> {
    // Consulta real fica pro webhook (já que o MP notifica automaticamente) — esse método existe pra satisfazer a interface, não é o caminho principal de atualização de status.
    return { status: "pendente" };
  }

  async segundaVia(): Promise<{ copiaCola?: string }> {
    throw new Error("Segunda via de Pix precisa gerar um novo Pix (Pix não tem 'segunda via' — o anterior expira). Chama gerarPix de novo.");
  }
}
