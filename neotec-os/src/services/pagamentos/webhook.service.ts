import { paymentRepository } from "./payment.repository";
import { paymentService } from "./payment.service";
import { MercadoPagoProvider } from "./providers/mercadopago.provider";

/**
 * WebhookService — único lugar que processa notificação de gateway de
 * pagamento. A rota HTTP (`/api/mercadopago/webhook`) só faz o parse
 * do corpo e chama isso aqui; toda a lógica de confiar/desconfiar do
 * payload fica nesta classe.
 */
export class WebhookService {
  /**
   * Nunca confia no status que vem dentro do corpo da notificação —
   * o Mercado Pago manda só um aviso ("um pagamento mudou, vai
   * conferir"), e esse aviso podia, em teoria, ser forjado por
   * qualquer um que soubesse a URL. Por isso sempre busca o status
   * real direto na API, autenticado com o Access Token, antes de
   * mudar qualquer coisa no pedido.
   */
  async processarNotificacao(body: { type?: string; data?: { id?: string } }): Promise<void> {
    await paymentRepository.registrarWebhookRecebido("mercadopago");

    if (body?.type !== "payment" || !body?.data?.id) return; // outros tipos de evento (ex: merchant_order) — ignora, não é o que processamos

    const config = await paymentRepository.buscarConfiguracao("mercadopago", false);
    if (!config?.access_token) return;

    const provider = new MercadoPagoProvider(config.access_token);
    const statusReal = await provider.buscarPagamento(body.data.id);

    await paymentService.processarNotificacaoWebhook(body.data.id, statusReal.status);
  }
}

export const webhookService = new WebhookService();
