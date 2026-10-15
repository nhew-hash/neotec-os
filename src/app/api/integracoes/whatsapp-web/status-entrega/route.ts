import { NextResponse, type NextRequest } from "next/server";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";
import { aplicarStatusEntrega } from "@/services/whatsapp/whatsapp.service";
import type { StatusEntregaMensagem } from "@/types";

const VALIDOS: StatusEntregaMensagem[] = ["entregue", "lido", "erro"];

/**
 * Recibo de entrega/leitura de mensagem ENVIADA, vindo da Bridge
 * (`messages.update`). Antes era ignorado: os tiques do chat nunca mudavam
 * para quem usa o WhatsApp Web. O status só avança (ver entrega-status.ts).
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) return new NextResponse("Não autorizado", { status: 401 });
  const body = (await request.json().catch(() => null)) as { idExterno?: string; status?: string } | null;
  const status = body?.status as StatusEntregaMensagem | undefined;
  if (!body?.idExterno || !status || !VALIDOS.includes(status)) {
    return NextResponse.json({ ok: false, erro: "idExterno e status (entregue|lido|erro) obrigatórios" }, { status: 400 });
  }
  try {
    const aplicado = await aplicarStatusEntrega(body.idExterno, status);
    return NextResponse.json({ ok: true, aplicado });
  } catch (err) {
    return NextResponse.json({ ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
}
