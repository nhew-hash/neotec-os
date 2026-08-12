"use server";

import { obterGraficoVisitantes, obterAtividadeRecente, obterOnlineAgora, type PontoGrafico, type AtividadeRecente } from "./loja-analytics.service";
import type { ActionResult } from "@/types";

export async function obterOnlineAgoraAction(): Promise<ActionResult<number>> {
  try {
    return { success: true, data: await obterOnlineAgora() };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar" };
  }
}

export async function obterGraficoVisitantesAction(periodo: "hoje" | "7dias" | "30dias"): Promise<ActionResult<PontoGrafico[]>> {
  try {
    const dados = await obterGraficoVisitantes(periodo);
    return { success: true, data: dados };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar gráfico" };
  }
}

export async function obterAtividadeRecenteAction(): Promise<ActionResult<AtividadeRecente[]>> {
  try {
    const dados = await obterAtividadeRecente();
    return { success: true, data: dados };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar atividade" };
  }
}
