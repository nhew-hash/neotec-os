"use server";

import { revalidatePath } from "next/cache";
import { paymentRepository } from "./payment.repository";
import { MercadoPagoProvider } from "./providers/mercadopago.provider";
import { extrairMensagemErro } from "./erro.utils";
import type { ActionResult, ConfiguracaoGatewayPagamento } from "@/types";

export async function atualizarConfiguracaoGatewayAction(
  gateway: string,
  input: Partial<Pick<ConfiguracaoGatewayPagamento, "public_key" | "access_token" | "webhook_secret" | "modo" | "ativo">>
): Promise<ActionResult> {
  try {
    await paymentRepository.atualizarConfiguracao(gateway, input);
    revalidatePath("/configuracoes/pagamentos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Erro ao salvar") };
  }
}

export async function testarConexaoGatewayAction(gateway: string): Promise<ActionResult<{ conectado: boolean }>> {
  try {
    const config = await paymentRepository.buscarConfiguracao(gateway, true);
    if (!config?.access_token) return { success: false, error: "Preencha o Access Token antes de testar" };

    const provider = new MercadoPagoProvider(config.access_token);
    const conectado = await provider.testarConexao();

    await paymentRepository.atualizarConfiguracao(gateway, {
      ultimo_teste_conexao_em: new Date().toISOString(),
      ultimo_teste_conexao_sucesso: conectado,
    });

    revalidatePath("/configuracoes/pagamentos");
    return { success: true, data: { conectado } };
  } catch (err) {
    return { success: false, error: extrairMensagemErro(err, "Erro ao testar conexão") };
  }
}
