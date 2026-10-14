"use server";

import { revalidatePath } from "next/cache";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { adiarSugestao, aprovarEEnviarSugestao, descartarSugestao, listarSugestoes, obterConfigBot, registrarResultadoSugestao, salvarConfigBot, type SugestaoComercial } from "./sugestoes-comerciais.service";
import type { ActionResult } from "@/types";

const EQUIPE = ["admin", "gerente", "vendedor"] as const;

function revalidar() {
  revalidatePath("/central-comercial");
  revalidatePath("/central-comercial/gerente");
}

export async function listarMinhasSugestoesAction(): Promise<ActionResult<SugestaoComercial[]>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    // Vendedor vê as suas e as sem responsável; gerente/admin veem todas.
    const todas = await listarSugestoes({ limite: 100 });
    const dados = auth.cargo === "vendedor" ? todas.filter((s) => !s.responsavel_id || s.responsavel_id === auth.userId) : todas;
    return { success: true, data: dados };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar sugestões" };
  }
}

export async function aprovarEEnviarSugestaoAction(id: string, texto: string): Promise<ActionResult> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await aprovarEEnviarSugestao(id, texto, auth.userId);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar" };
  }
}

export async function adiarSugestaoAction(id: string, ateIso: string): Promise<ActionResult<{ novoHorario: string }>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const ate = new Date(ateIso);
  if (Number.isNaN(ate.getTime())) return { success: false, error: "Data inválida." };
  try {
    const efetivo = await adiarSugestao(id, ate, auth.userId);
    revalidar();
    return { success: true, data: { novoHorario: efetivo.toISOString() } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao adiar" };
  }
}

export async function descartarSugestaoAction(id: string, motivo: string): Promise<ActionResult> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await descartarSugestao(id, motivo, auth.userId);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao descartar" };
  }
}

export async function registrarResultadoSugestaoAction(id: string, resultado: "respondeu" | "sem_resposta" | "fechou" | "perdido", obs: string): Promise<ActionResult> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await registrarResultadoSugestao(id, resultado, obs);
    revalidar();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar" };
  }
}

export async function obterConfigBotAction(): Promise<ActionResult<Awaited<ReturnType<typeof obterConfigBot>>>> {
  const auth = await exigirCargo(["admin", "gerente"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    return { success: true, data: await obterConfigBot() };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar configuração" };
  }
}

export async function salvarConfigBotAction(input: { modo: "assistente" | "automatico"; hora_inicio: number; hora_fim: number; permite_domingo: boolean }): Promise<ActionResult> {
  const auth = await exigirCargo(["admin"]);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await salvarConfigBot(input, auth.userId);
    revalidatePath("/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
