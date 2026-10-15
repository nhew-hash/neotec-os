import type { NextRequest } from "next/server";
import { segredoConfere } from "../webhook-assinatura";

/** Confere o segredo compartilhado que o Bridge manda em toda chamada (tempo constante). */
export function bridgeAutenticado(request: NextRequest): boolean {
  return segredoConfere(request.headers.get("x-bridge-secret"), process.env.WHATSAPP_WEB_BRIDGE_SECRET);
}
