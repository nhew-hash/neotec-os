"use server";

import { revalidatePath } from "next/cache";
import { atualizarConfig, alternarFlag } from "./config.service";
import { conectarConta, criarOuAtualizarCampanha, sincronizar } from "./ads.service";
import { rodarDiagnostico, resolverDiagnostico } from "./diagnostico.service";
import { registrarDecisao, avaliarDecisao } from "./decisoes.service";
import type { ActionResult, NeoPerformanceConfig, PlataformaAds } from "@/types";

export async function atualizarConfigAction(
  input: Partial<Omit<NeoPerformanceConfig, "id" | "loja_id" | "updated_at">>
): Promise<ActionResult> {
  try {
    await atualizarConfig(input);
    revalidatePath("/neo-performance");
    revalidatePath("/neo-performance/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configuração" };
  }
}

export async function alternarFlagAction(chave: string, ativo: boolean): Promise<ActionResult> {
  try {
    await alternarFlag(chave, ativo);
    revalidatePath("/neo-performance/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao alterar flag" };
  }
}

export async function conectarContaAction(plataforma: PlataformaAds, contaExternaId: string, nome?: string): Promise<ActionResult> {
  try {
    await conectarConta({ plataforma, conta_externa_id: contaExternaId, nome });
    revalidatePath("/neo-performance/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao conectar conta" };
  }
}

export async function criarCampanhaAction(input: Parameters<typeof criarOuAtualizarCampanha>[0]): Promise<ActionResult> {
  try {
    await criarOuAtualizarCampanha(input);
    revalidatePath("/neo-performance");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar campanha" };
  }
}

export async function sincronizarContaAction(contaId: string): Promise<ActionResult> {
  try {
    const log = await sincronizar(contaId);
    revalidatePath("/neo-performance");
    // `sincronizar` sempre registra o log; se não houve sincronização real
    // (sem credenciais/API ainda implementada — ver comentário em
    // ads.service.ts), devolve como erro pra UI mostrar a mensagem certa
    // em vez de dar a entender que sincronizou de verdade.
    if (log.status === "erro") return { success: false, error: log.erro ?? "Sincronização não realizada" };
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao sincronizar" };
  }
}

export async function rodarDiagnosticoAction(): Promise<ActionResult<{ gerados: number }>> {
  try {
    const resultado = await rodarDiagnostico();
    revalidatePath("/neo-performance");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao rodar diagnóstico" };
  }
}

export async function resolverDiagnosticoAction(id: string, status: "resolvido" | "ignorado"): Promise<ActionResult> {
  try {
    await resolverDiagnostico(id, status);
    revalidatePath("/neo-performance");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar diagnóstico" };
  }
}

export async function registrarDecisaoAction(input: Parameters<typeof registrarDecisao>[0]): Promise<ActionResult> {
  try {
    await registrarDecisao(input);
    revalidatePath("/neo-performance/decisoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar decisão" };
  }
}

export async function avaliarDecisaoAction(id: string, resultadoPosterior: string): Promise<ActionResult> {
  try {
    await avaliarDecisao(id, resultadoPosterior);
    revalidatePath("/neo-performance/decisoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao avaliar decisão" };
  }
}
