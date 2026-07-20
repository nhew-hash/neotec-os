import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pesos fixos, definidos em código — não é "a IA decide o peso", é "a IA
 * detecta o sinal, o código soma os pontos". Mantém o score auditável e
 * consistente (mesma pergunta sempre vale a mesma pontuação), em vez de
 * a IA inventar um número diferente a cada chamada.
 */
export const PONTOS_SINAL: Record<string, { pontos: number; label: string }> = {
  perguntou_preco: { pontos: 10, label: "Perguntou preço" },
  perguntou_disponibilidade: { pontos: 20, label: "Perguntou disponibilidade" },
  pediu_condicao_pagamento: { pontos: 30, label: "Pediu condição de pagamento" },
  informou_compra_hoje: { pontos: 25, label: "Informou que compra hoje" },
  pediu_reserva: { pontos: 30, label: "Pediu reserva do aparelho" },
  comparou_modelos: { pontos: 15, label: "Comparou modelos" },
};

export type SinalCompra = keyof typeof PONTOS_SINAL;

/**
 * Aplica os sinais detectados pela IA numa mensagem — soma ao score
 * atual do card e grava cada evento (motivo + pontos) pra dar
 * transparência de onde o número veio, não só o total final.
 */
export async function aplicarSinaisScore(cardId: string, sinais: string[]): Promise<number> {
  const supabase = createAdminClient();
  const sinaisValidos = sinais.filter((s): s is SinalCompra => s in PONTOS_SINAL);
  if (sinaisValidos.length === 0) {
    const { data } = await supabase.from("crm_cards").select("score").eq("id", cardId).maybeSingle();
    return data?.score ?? 0;
  }

  const pontosGanhos = sinaisValidos.reduce((acc, s) => acc + PONTOS_SINAL[s].pontos, 0);

  await supabase.from("crm_score_eventos").insert(
    sinaisValidos.map((s) => ({ card_id: cardId, motivo: PONTOS_SINAL[s].label, pontos: PONTOS_SINAL[s].pontos }))
  );

  const { data: cardAtual } = await supabase.from("crm_cards").select("score").eq("id", cardId).maybeSingle();
  const novoScore = (cardAtual?.score ?? 0) + pontosGanhos;

  await supabase.from("crm_cards").update({ score: novoScore }).eq("id", cardId);

  return novoScore;
}
