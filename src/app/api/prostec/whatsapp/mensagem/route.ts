import { NextResponse, type NextRequest } from "next/server";

/** Bridge da Prostec chama a cada mensagem nova recebida. Já normalizada (telefone + texto). */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bridge-secret");
  if (!secret || secret !== process.env.WHATSAPP_PROSTEC_BRIDGE_SECRET) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const body = await request.json();
    const telefone = body.telefone as string;
    const texto = body.texto as string;
    if (!telefone || !texto) return NextResponse.json({ ok: false, erro: "telefone e texto são obrigatórios" }, { status: 400 });

    const { processarMensagemRecebidaIara } = await import("@/services/prostec/whatsapp/prostec-bot.service");
    await processarMensagemRecebidaIara(telefone, texto);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao processar mensagem da Prostec:", err);
    return NextResponse.json({ ok: false });
  }
}
