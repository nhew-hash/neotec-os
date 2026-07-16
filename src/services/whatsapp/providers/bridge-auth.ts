import type { NextRequest } from "next/server";

/** Confere o segredo compartilhado que o Bridge manda em toda chamada. */
export function bridgeAutenticado(request: NextRequest): boolean {
  const secret = request.headers.get("x-bridge-secret");
  const esperado = process.env.WHATSAPP_WEB_BRIDGE_SECRET;
  return Boolean(esperado) && secret === esperado;
}
