"use server";

import { revalidatePath } from "next/cache";
import { criarReferencia, atualizarStatusReferencia, analisarDna } from "./referencias.service";
import { criarHook } from "./hooks-ofertas.service";
import { criarBrief, gerarRoteiroECopy } from "./creative-factory.service";
import { criarTeste, iniciarTeste, avaliarTeste } from "./test-lab.service";
import { criarRegra, alternarRegra, pararAutomacoes, religarAutomacoes, definirModoAutonomia, avaliarRegras, pausarConta } from "./automation-engine.service";
import { backtestRegra } from "./simulation.service";
import { criarOportunidade, atualizarStatusOportunidade, detectarOportunidades } from "./oportunidades.service";
import type { ActionResult, StatusValidacaoCriativo, CategoriaHook, AutomationRegra, ModoAutonomia, SimulacaoResultado, StatusOportunidade } from "@/types";

// ---- Fase 2 ----

export async function criarReferenciaAction(input: { origem: string; url_origem?: string; observacoes?: string }): Promise<ActionResult> {
  try {
    await criarReferencia(input);
    revalidatePath("/neo-performance/inteligencia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar referência" };
  }
}

export async function atualizarStatusReferenciaAction(id: string, status: StatusValidacaoCriativo): Promise<ActionResult> {
  try {
    await atualizarStatusReferencia(id, status);
    revalidatePath("/neo-performance/inteligencia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function analisarDnaAction(referenciaId: string, descricao: string): Promise<ActionResult> {
  try {
    await analisarDna(referenciaId, descricao);
    revalidatePath("/neo-performance/inteligencia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao analisar DNA" };
  }
}

export async function criarHookAction(input: { categoria: CategoriaHook; texto: string; origem_referencia_id?: string }): Promise<ActionResult> {
  try {
    await criarHook(input);
    revalidatePath("/neo-performance/inteligencia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar hook" };
  }
}

export async function criarBriefAction(input: Parameters<typeof criarBrief>[0]): Promise<ActionResult> {
  try {
    await criarBrief(input);
    revalidatePath("/neo-performance/creative-factory");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar brief" };
  }
}

export async function gerarRoteiroECopyAction(briefId: string): Promise<ActionResult> {
  try {
    await gerarRoteiroECopy(briefId);
    revalidatePath("/neo-performance/creative-factory");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao gerar roteiro/copy" };
  }
}

export async function criarTesteAction(input: Parameters<typeof criarTeste>[0]): Promise<ActionResult> {
  try {
    await criarTeste(input);
    revalidatePath("/neo-performance/test-lab");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar teste" };
  }
}

export async function iniciarTesteAction(id: string): Promise<ActionResult> {
  try {
    await iniciarTeste(id);
    revalidatePath("/neo-performance/test-lab");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao iniciar teste" };
  }
}

export async function avaliarTesteAction(id: string): Promise<ActionResult> {
  try {
    await avaliarTeste(id);
    revalidatePath("/neo-performance/test-lab");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao avaliar teste" };
  }
}

// ---- Fase 3 ----

export async function criarRegraAction(input: { nome: string; condicoes: AutomationRegra["condicoes"]; acao: string }): Promise<ActionResult> {
  try {
    await criarRegra(input);
    revalidatePath("/neo-performance/automacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar regra" };
  }
}

export async function alternarRegraAction(id: string, ativa: boolean): Promise<ActionResult> {
  try {
    await alternarRegra(id, ativa);
    revalidatePath("/neo-performance/automacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao alterar regra" };
  }
}

export async function pararAutomacoesAction(): Promise<ActionResult> {
  try {
    await pararAutomacoes();
    revalidatePath("/neo-performance/automacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao parar automações" };
  }
}

export async function religarAutomacoesAction(): Promise<ActionResult> {
  try {
    await religarAutomacoes();
    revalidatePath("/neo-performance/automacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao religar automações" };
  }
}

export async function pausarContaAction(contaId: string, motivo: string): Promise<ActionResult> {
  try {
    await pausarConta(contaId, motivo);
    revalidatePath("/neo-performance/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao pausar conta" };
  }
}

export async function definirModoAutonomiaAction(modo: ModoAutonomia): Promise<ActionResult> {
  try {
    await definirModoAutonomia(modo);
    revalidatePath("/neo-performance/automacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao definir modo" };
  }
}

export async function avaliarRegrasAction(): Promise<ActionResult<{ avaliadas: number; decisoesRegistradas: number }>> {
  try {
    const resultado = await avaliarRegras();
    revalidatePath("/neo-performance/automacao");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao avaliar regras" };
  }
}

export async function backtestRegraAction(regra: Parameters<typeof backtestRegra>[0], dias?: number): Promise<ActionResult<SimulacaoResultado>> {
  try {
    const resultado = await backtestRegra(regra, dias);
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao simular" };
  }
}

// ---- Fase 4 — Central de Oportunidades ----

export async function criarOportunidadeAction(input: Parameters<typeof criarOportunidade>[0]): Promise<ActionResult> {
  try {
    await criarOportunidade(input);
    revalidatePath("/neo-performance/oportunidades");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar oportunidade" };
  }
}

export async function atualizarStatusOportunidadeAction(id: string, status: StatusOportunidade): Promise<ActionResult> {
  try {
    await atualizarStatusOportunidade(id, status);
    revalidatePath("/neo-performance/oportunidades");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function detectarOportunidadesAction(): Promise<ActionResult<{ criadas: number }>> {
  try {
    const resultado = await detectarOportunidades();
    revalidatePath("/neo-performance/oportunidades");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao detectar oportunidades" };
  }
}
