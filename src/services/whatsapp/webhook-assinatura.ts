import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validação da assinatura `X-Hub-Signature-256` do webhook da Meta.
 *
 * Fail-closed: sem `WHATSAPP_APP_SECRET` configurado, o webhook RECUSA o
 * POST. Antes, a falta do segredo aceitava qualquer corpo — qualquer pessoa
 * na internet podia injetar "mensagens" que criavam cliente/card e faziam a
 * IA de atendimento responder pelo WhatsApp a números arbitrários.
 *
 * `permitirSemAssinatura` existe só para desenvolvimento local
 * (`WHATSAPP_WEBHOOK_ALLOW_UNSIGNED=true`) e nunca vale em produção.
 */
export type ResultadoAssinatura =
  | { valida: true }
  | { valida: false; motivo: "segredo_ausente" | "assinatura_ausente" | "assinatura_invalida" };

export function verificarAssinaturaMeta(params: {
  corpo: string;
  assinatura: string | null;
  segredo: string | undefined;
  permitirSemAssinatura?: boolean;
  producao?: boolean;
}): ResultadoAssinatura {
  const { corpo, assinatura, segredo } = params;

  if (!segredo) {
    if (params.permitirSemAssinatura && !params.producao) return { valida: true };
    return { valida: false, motivo: "segredo_ausente" };
  }
  if (!assinatura) return { valida: false, motivo: "assinatura_ausente" };

  const esperado = Buffer.from("sha256=" + createHmac("sha256", segredo).update(corpo).digest("hex"));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    return { valida: false, motivo: "assinatura_invalida" };
  }
  return { valida: true };
}

/** Comparação de segredo compartilhado (Bridge) em tempo constante. */
export function segredoConfere(recebido: string | null, esperado: string | undefined): boolean {
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
