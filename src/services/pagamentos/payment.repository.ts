import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Pagamento, ConfiguracaoGatewayPagamento, StatusPagamento } from "@/types";

/**
 * PaymentRepository — única camada que fala diretamente com as
 * tabelas `pagamentos` e `configuracoes_gateway_pagamento`. Nenhum
 * outro módulo faz `.from("pagamentos")` direto — sempre passa por
 * aqui.
 */
export class PaymentRepository {
  async criarPagamento(input: {
    pedidoId: string;
    gateway: string;
    valor: number;
    tipoPagamento?: Pagamento["tipo_pagamento"];
    parcelas?: number;
  }): Promise<Pagamento> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pagamentos")
      .insert({
        pedido_id: input.pedidoId,
        gateway: input.gateway,
        valor: input.valor,
        tipo_pagamento: input.tipoPagamento ?? null,
        parcelas: input.parcelas ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Não foi possível criar o registro de pagamento: ${error.message}`);
    return data;
  }

  async atualizarPagamento(id: string, input: Partial<Pick<Pagamento,
    "payment_id" | "status" | "valor_liquido" | "taxa_gateway" | "pix_qrcode" | "pix_copia_cola" | "pix_expira_em" | "metadata"
  >>): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("pagamentos").update(input).eq("id", id);
    if (error) throw new Error(`Não foi possível atualizar o pagamento: ${error.message}`);
  }

  async buscarPorId(id: string): Promise<Pagamento | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("pagamentos").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Não foi possível buscar o pagamento: ${error.message}`);
    return data;
  }

  async buscarPorPaymentIdExterno(paymentId: string, gateway: string): Promise<Pagamento | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("pagamentos").select("*").eq("payment_id", paymentId).eq("gateway", gateway).maybeSingle();
    if (error) throw new Error(`Não foi possível buscar o pagamento: ${error.message}`);
    return data;
  }

  async buscarUltimoPorPedido(pedidoId: string): Promise<Pagamento | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pagamentos").select("*").eq("pedido_id", pedidoId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Não foi possível buscar o pagamento: ${error.message}`);
    return data;
  }

  async atualizarStatusPedido(pedidoId: string, status: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("pedidos_loja").update({ status }).eq("id", pedidoId);
    if (error) throw new Error(`Não foi possível atualizar o pedido: ${error.message}`);
  }

  /** Config lida com sessão (tela de admin) ou via admin client (checkout/webhook, que rodam sem sessão de usuário do Neotec OS). */
  async buscarConfiguracao(gateway: string, comSessao: boolean): Promise<ConfiguracaoGatewayPagamento | null> {
    const supabase = comSessao ? await createClient() : createAdminClient();
    const { data, error } = await supabase.from("configuracoes_gateway_pagamento").select("*").eq("gateway", gateway).maybeSingle();
    if (error) throw new Error(`Não foi possível carregar a configuração: ${error.message}`);
    return data;
  }

  async atualizarConfiguracao(gateway: string, input: Partial<Pick<ConfiguracaoGatewayPagamento,
    "public_key" | "access_token" | "webhook_secret" | "modo" | "ativo" |
    "ultimo_teste_conexao_em" | "ultimo_teste_conexao_sucesso" | "ultimo_webhook_recebido_em" | "ultimo_pagamento_aprovado_em"
  >>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("configuracoes_gateway_pagamento").update(input).eq("gateway", gateway);
    if (error) throw new Error(`Não foi possível salvar a configuração: ${error.message}`);
  }

  /** Só pro webhook — sem sessão de usuário, usa admin client. */
  async registrarWebhookRecebido(gateway: string): Promise<void> {
    const supabase = createAdminClient();
    await supabase.from("configuracoes_gateway_pagamento").update({ ultimo_webhook_recebido_em: new Date().toISOString() }).eq("gateway", gateway);
  }

  async registrarPagamentoAprovado(gateway: string): Promise<void> {
    const supabase = createAdminClient();
    await supabase.from("configuracoes_gateway_pagamento").update({ ultimo_pagamento_aprovado_em: new Date().toISOString() }).eq("gateway", gateway);
  }
}

export const paymentRepository = new PaymentRepository();

export const STATUS_PAGAMENTO_PARA_PEDIDO: Record<StatusPagamento, string> = {
  aprovado: "concluido",
  pendente: "novo",
  recusado: "cancelado",
  cancelado: "cancelado",
  estornado: "cancelado",
  chargeback: "cancelado",
  expirado: "cancelado",
};
