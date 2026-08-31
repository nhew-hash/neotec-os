import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const idExterno = body.idExterno as string | undefined;
    if (!telefone || !texto) return NextResponse.json({ ok: false, erro: "telefone e texto são obrigatórios" }, { status: 400 });

    // Idempotência — se a Bridge reenviar a mesma mensagem (retry de
    // rede), nunca processa duas vezes. Usa o id real da mensagem
    // quando a Bridge manda; sem isso, usa um hash de
    // telefone+texto+minuto como aproximação razoável (nunca perfeita,
    // mas cobre o caso comum de retry imediato).
    const chaveIdempotencia = idExterno ?? createHash("sha256").update(`${telefone}:${texto}:${Math.floor(Date.now() / 60_000)}`).digest("hex");

    const admin = createAdminClient();
    const { error: erroInsert } = await admin.from("prostec_mensagens_processadas").insert({ message_id: chaveIdempotencia });
    if (erroInsert) {
      // Violação de chave única = já processamos essa mensagem antes — ignora silenciosamente, não é erro de verdade.
      if (erroInsert.code === "23505") return NextResponse.json({ ok: true, duplicada: true });
      throw new Error(erroInsert.message);
    }

    const { processarMensagemRecebidaIara } = await import("@/services/prostec/whatsapp/prostec-bot.service");
    await processarMensagemRecebidaIara(telefone, texto);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao processar mensagem da Prostec:", err);
    return NextResponse.json({ ok: false });
  }
}
