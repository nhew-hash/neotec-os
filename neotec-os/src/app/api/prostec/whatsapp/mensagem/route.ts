import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bridge da Prostec chama a cada mensagem nova recebida. Payload real do Bridge: telefone, nomeContato, tipo, conteudo, idExterno, jidOriginal, midiaBase64?, midiaMimeType?. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bridge-secret");
  if (!secret || secret !== process.env.WHATSAPP_PROSTEC_BRIDGE_SECRET) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const body = await request.json();
    const telefone = body.telefone as string;
    const tipo = body.tipo as string;
    const conteudo = body.conteudo as string;
    const idExterno = body.idExterno as string | undefined;
    if (!telefone) return NextResponse.json({ ok: false, erro: "telefone é obrigatório" }, { status: 400 });

    const chaveIdempotencia = idExterno ?? createHash("sha256").update(`${telefone}:${conteudo}:${Math.floor(Date.now() / 60_000)}`).digest("hex");

    const admin = createAdminClient();
    const { error: erroInsert } = await admin.from("prostec_mensagens_processadas").insert({ message_id: chaveIdempotencia });
    if (erroInsert) {
      if (erroInsert.code === "23505") return NextResponse.json({ ok: true, duplicada: true });
      throw new Error(erroInsert.message);
    }

    // A Iara só entende texto por enquanto — imagem/áudio/documento
    // fica registrado (pra staff ver na conversa depois), mas não gera
    // resposta automática do bot (evita responder "certo" pra uma
    // legenda de foto que não tem nada a ver com o texto real).
    if (tipo && tipo !== "texto") {
      return NextResponse.json({ ok: true, ignorado: "tipo de mídia não processado pela Iara ainda" });
    }

    const { processarMensagemRecebidaIara } = await import("@/services/prostec/whatsapp/prostec-bot.service");
    await processarMensagemRecebidaIara(telefone, conteudo || "");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao processar mensagem da Prostec:", err);
    return NextResponse.json({ ok: false });
  }
}
