"use server";

import {
  listarMarcasTradeIn,
  listarFamiliasTradeIn,
  listarVariantesTradeIn,
  avaliarPorModeloId,
  criarAvaliacao,
  marcarAguardandoAvaliacao,
  obterAvaliacao,
} from "@/services/trade-in/aplicacao.service";
import { OPCOES_COMPRA_TROCA, type FormaCompraTroca } from "@/services/trade-in/como-funciona";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

/**
 * Todas as actions aqui são PÚBLICAS (chamadas do site, sem sessão).
 * Regra de segurança do módulo: o cliente recebe só o resultado
 * necessário — nunca o valor base, o detalhamento de descontos por
 * avaria ou o texto de regras internas (`regrasAplicadas`). Quem quiser
 * o detalhamento usa a tela do Neotec OS (`calcularPreviaTradeInAction`),
 * que exige sessão de staff.
 */

export async function listarMarcasTradeInAction(): Promise<ActionResult<string[]>> {
  try {
    return { success: true, data: await listarMarcasTradeIn() };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar marcas" };
  }
}

export async function listarFamiliasTradeInAction(marca: string): Promise<ActionResult<string[]>> {
  try {
    return { success: true, data: await listarFamiliasTradeIn(marca) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar modelos" };
  }
}

export async function listarVariantesTradeInAction(familia: string): Promise<ActionResult<{ id: string; nome: string }[]>> {
  try {
    return { success: true, data: await listarVariantesTradeIn(familia) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar variantes" };
  }
}

export interface EstimativaSitePublica {
  encontrado: boolean;
  valorEstimado?: number;
  bloqueado?: boolean;
  mensagem?: string;
}

export async function calcularEstimativaSiteAction(input: {
  modeloId: string;
  avariasMarcadas: string[];
  bateriaSaude?: number | null;
}): Promise<ActionResult<EstimativaSitePublica>> {
  try {
    const resultado = await avaliarPorModeloId(input.modeloId, {
      avariasMarcadas: input.avariasMarcadas,
      bateriaSaude: input.bateriaSaude ?? null,
    });
    if (!resultado.encontrado) return { success: true, data: { encontrado: false, mensagem: resultado.mensagem } };
    if (resultado.resultado.bloqueado) {
      return { success: true, data: { encontrado: true, bloqueado: true, mensagem: "Pelas respostas informadas, esse aparelho precisa passar por uma avaliação presencial da equipe." } };
    }
    return { success: true, data: { encontrado: true, bloqueado: false, valorEstimado: resultado.resultado.valorFinal } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao calcular a estimativa" };
  }
}

/**
 * Registra qual das 3 formas de compra (ver `como-funciona.ts`) o
 * cliente escolheu depois de ver a estimativa, e avisa a equipe por
 * WhatsApp — melhor esforço, nunca derruba a escolha do cliente se o
 * envio falhar (mesmo padrão de `criarTradeInAction`, Fase 60).
 */
export async function escolherFormaCompraSiteAction(input: {
  avaliacaoId: string;
  forma: FormaCompraTroca;
  clienteNome?: string;
  clienteTelefone?: string;
  produtoInteresse?: string;
}): Promise<ActionResult> {
  try {
    const admin = createAdminClient();
    const avaliacao = await obterAvaliacao(input.avaliacaoId, admin);
    if (!avaliacao) return { success: false, error: "Avaliação não encontrada" };

    if (input.forma === "enviar_aparelho") {
      await marcarAguardandoAvaliacao(input.avaliacaoId, { clienteNome: input.clienteNome, clienteTelefone: input.clienteTelefone });
    } else if (input.clienteNome || input.clienteTelefone) {
      await admin
        .from("avaliacoes_trade_in")
        .update({ cliente_nome: input.clienteNome || avaliacao.cliente_nome, cliente_telefone: input.clienteTelefone || avaliacao.cliente_telefone })
        .eq("id", input.avaliacaoId);
    }

    try {
      const { data: config } = await admin.from("configuracoes_precificacao").select("whatsapp_notificacao_staff").limit(1).maybeSingle();
      if (config?.whatsapp_notificacao_staff) {
        const { getActiveProvider } = await import("@/services/whatsapp/providers/provider-resolver");
        const { paraFormatoInternacionalBR } = await import("@/utils/telefone");
        const provider = await getActiveProvider();
        const opcao = OPCOES_COMPRA_TROCA.find((o) => o.id === input.forma);
        const resultadoEnvio = await provider.enviarTexto(
          paraFormatoInternacionalBR(config.whatsapp_notificacao_staff),
          `🔁 *Trade-in pelo site — ${opcao?.titulo ?? input.forma}*\n\n` +
            `*Aparelho:* ${avaliacao.modelo_nome}\n` +
            `*Estimativa:* R$ ${avaliacao.valor_calculado.toFixed(2)}\n` +
            `${input.clienteNome ? `*Cliente:* ${input.clienteNome}\n` : ""}` +
            `${input.clienteTelefone ? `*Telefone:* ${input.clienteTelefone}\n` : ""}` +
            `${input.produtoInteresse ? `*Interesse:* ${input.produtoInteresse}\n` : ""}`
        );
        if (!resultadoEnvio.enviado) console.error("WhatsApp de trade-in (escolha de forma de compra) não foi entregue:", resultadoEnvio.motivo);
      }
    } catch (erroWhatsapp) {
      console.error("Falha ao notificar staff sobre forma de compra do trade-in (não bloqueia a escolha):", erroWhatsapp);
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar sua escolha" };
  }
}

export async function criarEstimativaSiteAction(input: {
  modeloId: string;
  avariasMarcadas: string[];
  bateriaSaude?: number | null;
  clienteNome?: string;
  clienteTelefone?: string;
}): Promise<ActionResult<{ id: string } & EstimativaSitePublica>> {
  try {
    const resultado = await criarAvaliacao({
      origem: "site",
      modeloId: input.modeloId,
      avariasMarcadas: input.avariasMarcadas,
      bateriaSaude: input.bateriaSaude ?? null,
      clienteNome: input.clienteNome || null,
      clienteTelefone: input.clienteTelefone || null,
    });
    if ("encontrado" in resultado) return { success: true, data: { id: "", encontrado: false, mensagem: resultado.mensagem } };

    if (resultado.resultado.bloqueado) {
      return {
        success: true,
        data: { id: resultado.avaliacao.id, encontrado: true, bloqueado: true, mensagem: "Pelas respostas informadas, esse aparelho precisa passar por uma avaliação presencial da equipe." },
      };
    }
    return { success: true, data: { id: resultado.avaliacao.id, encontrado: true, bloqueado: false, valorEstimado: resultado.resultado.valorFinal } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar a estimativa" };
  }
}
