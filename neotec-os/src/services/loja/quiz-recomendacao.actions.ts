"use server";

import { gerarRecomendacoesQuiz, type RespostasQuiz, type RecomendacaoQuiz } from "./quiz-recomendacao.service";
import type { ActionResult } from "@/types";

export async function gerarRecomendacoesQuizAction(respostas: RespostasQuiz): Promise<ActionResult<{ recomendacoes: RecomendacaoQuiz[] }>> {
  try {
    const recomendacoes = await gerarRecomendacoesQuiz(respostas);
    return { success: true, data: { recomendacoes } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao gerar recomendações" };
  }
}
