import { MercadoPagoConfig, Payment } from "mercadopago";

export interface ResultadoPagamentoPix {
  paymentId: string;
  status: string;
  qrCodeBase64: string | null;
  copiaCola: string | null;
  expiraEm: string | null;
}

export interface ResultadoPagamentoCartao {
  paymentId: string;
  status: string;
  statusDetail: string | null;
}

/**
 * MercadoPagoProvider — única classe que fala com o SDK oficial do
 * Mercado Pago. PaymentService nunca importa `mercadopago` direto,
 * sempre passa por aqui — isso é o que permite trocar/adicionar
 * gateway (Stripe, Asaas, PagSeguro) no futuro sem tocar no
 * PaymentService, só implementando um provider novo com essa mesma
 * forma.
 */
export class MercadoPagoProvider {
  private cliente: MercadoPagoConfig;

  constructor(accessToken: string) {
    if (!accessToken) throw new Error("Access Token do Mercado Pago não configurado.");
    this.cliente = new MercadoPagoConfig({ accessToken });
  }

  /** Pix — pagamento nasce com QR Code e copia-e-cola prontos na resposta, sem etapa separada. */
  async criarPagamentoPix(input: { valor: number; descricao: string; email: string; externalReference: string }): Promise<ResultadoPagamentoPix> {
    const payment = new Payment(this.cliente);
    const resultado = await payment.create({
      body: {
        transaction_amount: input.valor,
        description: input.descricao,
        payment_method_id: "pix",
        payer: { email: input.email },
        external_reference: input.externalReference,
      },
    });

    const dadosPix = resultado.point_of_interaction?.transaction_data;

    return {
      paymentId: String(resultado.id ?? ""),
      status: resultado.status ?? "pending",
      qrCodeBase64: dadosPix?.qr_code_base64 ?? null,
      copiaCola: dadosPix?.qr_code ?? null,
      expiraEm: resultado.date_of_expiration ?? null,
    };
  }

  /**
   * Cartão — recebe só o TOKEN gerado no navegador pelo SDK JS do
   * Mercado Pago (Secure Fields), nunca número/CVV/validade crus. O
   * token já representa o cartão de forma segura; aqui só criamos a
   * cobrança em cima dele.
   */
  async criarPagamentoCartao(input: {
    token: string;
    valor: number;
    descricao: string;
    email: string;
    parcelas: number;
    metodoPagamentoId: string; // ex: "visa", "master" — devolvido pelo SDK junto com o token
    externalReference: string;
  }): Promise<ResultadoPagamentoCartao> {
    const payment = new Payment(this.cliente);
    const resultado = await payment.create({
      body: {
        transaction_amount: input.valor,
        token: input.token,
        description: input.descricao,
        installments: input.parcelas,
        payment_method_id: input.metodoPagamentoId,
        payer: { email: input.email },
        external_reference: input.externalReference,
      },
    });

    return {
      paymentId: String(resultado.id ?? ""),
      status: resultado.status ?? "pending",
      statusDetail: resultado.status_detail ?? null,
    };
  }

  /** Nunca confia no corpo do webhook — sempre busca o estado real aqui antes de mudar qualquer coisa. */
  async buscarPagamento(paymentId: string): Promise<{
    status: string; externalReference: string | null; valorLiquido: number | null; taxaGateway: number | null; metadata: Record<string, unknown>;
  }> {
    const payment = new Payment(this.cliente);
    const resultado = await payment.get({ id: paymentId });

    const taxas = resultado.fee_details?.reduce((acc, f) => acc + (f.amount ?? 0), 0) ?? null;
    const valorLiquido = resultado.transaction_amount != null && taxas != null ? resultado.transaction_amount - taxas : null;

    return {
      status: resultado.status ?? "unknown",
      externalReference: resultado.external_reference ?? null,
      valorLiquido,
      taxaGateway: taxas,
      metadata: JSON.parse(JSON.stringify(resultado)),
    };
  }

  /** Botão "Testar conexão" — chamada leve só pra confirmar que o Access Token é válido, sem criar cobrança nenhuma. */
  async testarConexao(): Promise<boolean> {
    try {
      const payment = new Payment(this.cliente);
      // Busca um ID que quase certamente não existe — o que importa é
      // o tipo de erro: 404 (token válido, só não achou o pagamento) é
      // sucesso de conexão; 401 (token inválido) é falha.
      await payment.get({ id: "0" });
      return true;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      return status === 404; // token válido, só não existe pagamento com esse id — esperado
    }
  }
}
