import { timingSafeEqual } from "crypto";

/**
 * Autenticação das rotas de cron. FALHA FECHADA: sem `CRON_SECRET`
 * configurado, ninguém passa (antes, `if (secret && ...)` deixava a rota
 * aberta quando a variável faltava).
 *
 * Função pura (recebe o segredo e o header) pra ser testável sem env.
 */
export function cronAutorizado(secret: string | undefined, authorization: string | null): boolean {
  if (!secret) return false;
  const esperado = Buffer.from(`Bearer ${secret}`);
  const recebido = Buffer.from(authorization ?? "");
  if (esperado.length !== recebido.length) return false;
  return timingSafeEqual(esperado, recebido);
}
