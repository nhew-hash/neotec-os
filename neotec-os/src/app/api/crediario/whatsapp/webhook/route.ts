import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** Webhook do WhatsApp de Cobrança — igual ao padrão da Prostec (Bridge própria), número completamente separado. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bridge-secret");
  if (!secret || secret !== process.env.WHATSAPP_COBRANCA_BRIDGE_SECRET) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const body = await request.json();
    const telefone = body.telefone as string;
    const texto = body.texto as string;
    const idExterno = body.idExterno as string | undefined;
    if (!telefone || !texto) return NextResponse.json({ ok: false }, { status: 400 });

    const chaveIdempotencia = idExterno ?? createHash("sha256").update(`cobranca:${telefone}:${texto}:${Math.floor(Date.now() / 60_000)}`).digest("hex");
    const admin = createAdminClient();
    const { error: erroInsert } = await admin.from("prostec_mensagens_processadas").insert({ message_id: chaveIdempotencia });
    if (erroInsert) {
      if (erroInsert.code === "23505") return NextResponse.json({ ok: true, duplicada: true });
      throw new Error(erroInsert.message);
    }

    const { processarMensagemCobranca } = await import("@/services/crediario/whatsapp/cobranca-bot.service");
    await processarMensagemCobranca(telefone, texto);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook de cobrança:", err);
    return NextResponse.json({ ok: false });
  }
}
