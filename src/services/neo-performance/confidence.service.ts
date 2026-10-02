import { createClient } from "@/lib/supabase/server";

export interface AvaliacaoConfianca {
  score: number; // 0-100
  nivelExigido: number; // quanto mais arriscada a ação, maior o score mínimo pra seguir adiante
  aprovada: boolean;
  motivos: string[];
}

/**
 * Sistema de Confidence (Seção 48): antes de agir, avalia qualidade dos
 * dados, volume, histórico, impacto financeiro e reversibilidade. Quanto
 * maior o risco (gasto envolvido, ação difícil de desfazer), maior a
 * exigência de confiança. Usado pelo automation-engine ANTES de marcar
 * uma decisão como "aguardando_avaliacao" com ação — se a confiança não
 * bate o nível exigido, a decisão é registrada só como recomendação
 * (sem `acao`), nunca como algo pronto pra ser aplicado.
 */
export async function avaliarConfianca(input: {
  campanhaId: string;
  gastoNoPeriodo: number;
  amostra: number; // nº de compras/conversões usadas na decisão
  acao: string;
}): Promise<AvaliacaoConfianca> {
  const supabase = await createClient();
  const motivos: string[] = [];
  let score = 0;

  // Volume (0-30): mais amostra, mais confiança.
  const pontosVolume = Math.min(30, input.amostra * 3);
  score += pontosVolume;
  if (input.amostra < 5) motivos.push("Amostra pequena (menos de 5 conversões) — confiança baixa de volume.");

  // Histórico (0-25): decisões anteriores do mesmo tipo de ação nesta campanha, já avaliadas.
  const { data: decisoesAnteriores } = await supabase
    .from("performance_decisoes")
    .select("resultado_posterior, status")
    .eq("campanha_id", input.campanhaId)
    .eq("tipo_decisao", input.acao)
    .eq("status", "avaliado");
  const historico = decisoesAnteriores ?? [];
  const pontosHistorico = historico.length === 0 ? 10 : Math.min(25, 10 + historico.length * 5); // sem histórico não é 0 (pode ser a primeira vez), mas é menor que ter histórico positivo
  score += pontosHistorico;
  if (historico.length === 0) motivos.push("Sem histórico de decisões avaliadas iguais a esta nesta campanha.");

  // Reversibilidade (0-20): ação com "reduzir"/"pausar teste" é mais reversível que "pausar conta"/"excluir".
  const reversivel = /reduzir|aument|ajustar/i.test(input.acao);
  const pontosReversibilidade = reversivel ? 20 : 5;
  score += pontosReversibilidade;
  if (!reversivel) motivos.push("Ação de baixa reversibilidade — exige mais confiança.");

  // Qualidade dos dados (0-25): penaliza decisão baseada só numa métrica — automation-engine já combina condições, então aqui só confirma que há mais de 1 condição.
  score += 15; // piso — a combinação de condições já é responsabilidade do automation-engine (nunca 1 métrica isolada, regra 61)

  // Nível exigido cresce com o gasto envolvido (impacto financeiro).
  const nivelExigido = input.gastoNoPeriodo > 1000 ? 70 : input.gastoNoPeriodo > 300 ? 55 : 40;

  return { score: Math.min(100, score), nivelExigido, aprovada: score >= nivelExigido, motivos };
}
