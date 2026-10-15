/**
 * Ciclo de vida da proposta, derivado do que já existe no domínio:
 *  - `orcamentos.status` (criado/enviado/visualizado/aprovado/recusado/expirado) — "aprovado" = virou venda;
 *  - eventos da migration fase268 (copiada, whatsapp_aberto, enviada, aceita, recusada...).
 * Função pura. "Enviada" só conta quando o evento veio de confirmação real (integração) ou de a vendedora afirmar.
 * Copiar o texto ou abrir o WhatsApp é apenas "compartilhada".
 */
export type EstadoProposta = "calculada" | "compartilhada" | "aguardando_resposta" | "aceita" | "recusada" | "expirada" | "convertida";

export interface EventoResumo { tipo: string; criado_em: string }

export const ROTULO_ESTADO: Record<EstadoProposta, { rotulo: string; tom: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  calculada: { rotulo: "Salva", tom: "neutral" },
  compartilhada: { rotulo: "Compartilhada", tom: "info" },
  aguardando_resposta: { rotulo: "Aguardando resposta", tom: "warning" },
  aceita: { rotulo: "Aceita", tom: "success" },
  recusada: { rotulo: "Recusada", tom: "danger" },
  expirada: { rotulo: "Expirada", tom: "neutral" },
  convertida: { rotulo: "Virou venda", tom: "success" },
};

export function estadoDaProposta(params: { status: string; validade: string | null; eventos: EventoResumo[]; agora: Date }): EstadoProposta {
  const { status, validade, agora } = params;
  if (status === "aprovado") return "convertida";
  const eventos = [...params.eventos].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const respostas = eventos.filter((e) => e.tipo === "aceita" || e.tipo === "recusada" || e.tipo === "aguardando_resposta");
  const ultimaResposta = respostas[respostas.length - 1]?.tipo;
  if (status === "recusado" || ultimaResposta === "recusada") return "recusada";
  if (ultimaResposta === "aceita") return "aceita";
  const vencida = status === "expirado" || (validade !== null && new Date(`${validade}T23:59:59-03:00`).getTime() < agora.getTime());
  if (vencida) return "expirada";
  if (ultimaResposta === "aguardando_resposta" || eventos.some((e) => e.tipo === "enviada") || status === "enviado" || status === "visualizado") return "aguardando_resposta";
  if (eventos.some((e) => e.tipo === "copiada" || e.tipo === "whatsapp_aberto")) return "compartilhada";
  return "calculada";
}

/** Propostas ainda em negociação (entram em "aguardando retorno"/"parados"). */
export function emNegociacao(estado: EstadoProposta): boolean {
  return estado === "calculada" || estado === "compartilhada" || estado === "aguardando_resposta" || estado === "aceita";
}

const TEXTO_EVENTO: Record<string, string> = {
  criada: "Proposta criada", editada: "Proposta atualizada", copiada: "Mensagem copiada",
  whatsapp_aberto: "WhatsApp aberto com a mensagem (envio não confirmado)", enviada: "Mensagem enviada",
  aguardando_resposta: "Aguardando resposta do cliente", aceita: "Cliente aceitou", recusada: "Cliente recusou", observacao: "Observação registrada",
};
export function textoDoEvento(tipo: string): string { return TEXTO_EVENTO[tipo] ?? tipo; }
