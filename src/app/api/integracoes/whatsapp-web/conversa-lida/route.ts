import { NextResponse, type NextRequest } from "next/server";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";
import { marcarLidaPeloAparelho } from "@/services/whatsapp/whatsapp.service";

/**
 * A Bridge chama isto quando a conversa é lida no celular/WhatsApp Web
 * vinculado (`chats.update` com unreadCount 0). Zera as "não lidas" no
 * Neotec OS — antes elas só zeravam abrindo a conversa dentro do sistema.
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) return new NextResponse("Não autorizado", { status: 401 });
  const body = (await request.json().catch(() => null)) as { telefone?: string; jid?: string } | null;
  if (!body?.telefone) return NextResponse.json({ ok: false, erro: "telefone obrigatório" }, { status: 400 });
  try {
    const atualizadas = await marcarLidaPeloAparelho({ telefone: body.telefone, jid: body.jid ?? null });
    return NextResponse.json({ ok: true, atualizadas });
  } catch (err) {
    return NextResponse.json({ ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
}
