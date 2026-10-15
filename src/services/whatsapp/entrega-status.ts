import type { StatusEntregaMensagem } from "@/types";

/**
 * Tradução dos status de entrega da Meta (`statuses[]` do webhook) para o
 * enum `status_entrega_mensagem` do banco.
 *
 * A Meta não garante ordem de chegada: um "delivered" pode chegar depois de
 * um "read". Por isso o status só AVANÇA (enviado → entregue → lido) — nunca
 * regride. "erro" é terminal e vence qualquer outro, porque a Meta só manda
 * "failed" quando a mensagem de fato não foi entregue.
 */
const MAPA_META: Record<string, StatusEntregaMensagem> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "erro",
};

const ORDEM: Record<StatusEntregaMensagem, number> = { enviando: 0, enviado: 1, entregue: 2, lido: 3, erro: 4 };

export function statusMetaParaEntrega(statusMeta: string): StatusEntregaMensagem | null {
  return MAPA_META[statusMeta] ?? null;
}

/** Devolve o novo status a gravar, ou null quando não há o que mudar. */
export function proximoStatusEntrega(atual: StatusEntregaMensagem, recebido: StatusEntregaMensagem): StatusEntregaMensagem | null {
  if (atual === "erro") return null;
  return ORDEM[recebido] > ORDEM[atual] ? recebido : null;
}
