/**
 * O SDK do Mercado Pago às vezes lança `Error` de verdade, às vezes
 * lança um objeto cru no formato `{ message, status, cause: [{code,
 * description}] }` (não é instância de `Error`) — código que só checa
 * `err instanceof Error` perde a mensagem real nesse segundo caso e
 * cai num fallback genérico, escondendo o motivo verdadeiro do erro.
 * Essa função tenta extrair a mensagem mais útil possível de qualquer
 * formato.
 */
export function extrairMensagemErro(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === "object") {
    const objeto = err as { message?: string; cause?: unknown; error?: string };

    // Formato de erro da API do Mercado Pago: cause é um array de {code, description}.
    if (Array.isArray(objeto.cause) && objeto.cause.length > 0) {
      const descricoes = objeto.cause
        .map((c) => (c && typeof c === "object" && "description" in c ? String((c as { description: unknown }).description) : null))
        .filter(Boolean);
      if (descricoes.length > 0) return descricoes.join("; ");
    }

    if (typeof objeto.message === "string" && objeto.message) return objeto.message;
    if (typeof objeto.error === "string" && objeto.error) return objeto.error;
  }

  if (typeof err === "string" && err) return err;

  return fallback;
}
