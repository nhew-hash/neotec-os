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
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) throw new Error("Access Token do Mercado Pago não configurado.");
    this.accessToken = accessToken;
    this.cliente = new MercadoPagoConfig({ accessToken });
  }

  /** Pix — pagamento nasce com QR Code e copia-e-cola prontos na resposta, sem etapa separada. */
  async criarPagamentoPix(input: { valor: number; descricao: string; email: string; cpf?: string; externalReference: string }): Promise<ResultadoPagamentoPix> {
    const payment = new Payment(this.cliente);
    const resultado = await payment.create({
      body: {
        transaction_amount: input.valor,
        description: input.descricao,
        payment_method_id: "pix",
        payer: {
          email: input.email,
          ...(input.cpf ? { identification: { type: "CPF", number: input.cpf.replace(/\D/g, "") } } : {}),
        },
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
    cpf?: string;
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
        payer: {
          email: input.email,
          ...(input.cpf ? { identification: { type: "CPF", number: input.cpf.replace(/\D/g, "") } } : {}),
        },
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

  /**
   * Tabela de parcelamento REAL — direto na API de parcelas do
   * Mercado Pago (o SDK Node não tem uma classe pronta pra esse
   * endpoint, então é `fetch` direto na REST API, com o mesmo Access
   * Token). Usa "master" (Mastercard) como bandeira de referência pra
   * dar uma tabela representativa sem precisar de um cartão real
   * digitado — é a mesma taxa que a conta tem configurada, só que sem
   * saber ainda QUAL bandeira o cliente vai usar de fato (isso só se
   * sabe no checkout, onde o Brick já mostra o valor exato pro cartão
   * digitado).
   */
  async buscarTabelaParcelas(valor: number): Promise<{ parcelas: number; valorParcela: number; valorTotal: number; temJuros: boolean; taxaJuros: number }[]> {
    const url = `https://api.mercadopago.com/v1/payment_methods/installments?amount=${valor}&payment_method_id=master&locale=pt-BR`;
    const resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      next: { revalidate: 3600 }, // 1h de cache — taxa de juros não muda a cada minuto, evita bater na API a cada visita
    });

    if (!resposta.ok) throw new Error("Não foi possível consultar as parcelas no Mercado Pago agora.");

    const dados = await resposta.json();
    const opcoes = dados?.[0]?.payer_costs as { installments: number; installment_amount: number; total_amount: number; installment_rate: number }[] | undefined;
    if (!opcoes) return [];

    return opcoes.map((o) => ({
      parcelas: o.installments,
      valorParcela: o.installment_amount,
      valorTotal: o.total_amount,
      temJuros: o.installment_rate > 0,
      taxaJuros: o.installment_rate,
    }));
  }
}
