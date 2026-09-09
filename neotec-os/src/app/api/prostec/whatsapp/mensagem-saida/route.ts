import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bridge chama quando detecta uma mensagem "fromMe" — pode ser uma
 * que o próprio Neotec OS mandou (já registrada na hora do envio,
 * nesse caso só ignora aqui pra não duplicar) ou uma que a equipe
 * respondeu direto pelo celular vinculado, sem passar pelo sistema
 * (nesse caso registra, pra manter a conversa completa na tela).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bridge-secret");
  if (!secret || secret !== process.env.WHATSAPP_PROSTEC_BRIDGE_SECRET) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const body = await request.json();
    const telefone = body.telefone as string;
    const conteudo = body.conteudo as string;
    const idExterno = body.idExterno as string | undefined;
    if (!telefone) return NextResponse.json({ ok: false }, { status: 400 });

    const admin = createAdminClient();

    const chaveIdempotencia = idExterno ?? createHash("sha256").update(`saida:${telefone}:${conteudo}:${Math.floor(Date.now() / 60_000)}`).digest("hex");
    const { error: erroInsert } = await admin.from("prostec_mensagens_processadas").insert({ message_id: chaveIdempotencia });
    if (erroInsert) {
      if (erroInsert.code === "23505") return NextResponse.json({ ok: true, duplicada: true });
      throw new Error(erroInsert.message);
    }

    const { data: conversa } = await admin.from("prostec_conversas").select("id").eq("telefone", telefone).maybeSingle();
    if (!conversa) return NextResponse.json({ ok: true }); // não é conversa da Prostec, ignora

    // Se já não tem essa mensagem registrada (o Neotec OS já teria
    // salvo na hora do envio, se foi por aqui), registra como vinda
    // de fora — provavelmente respondida direto pelo celular. Marca
    // como conversa assumida por humano, já que alguém está
    // respondendo manualmente por fora do sistema.
    await admin.from("prostec_mensagens").insert({ conversa_id: conversa.id, remetente: "vendedor", conteudo: conteudo || "" });
    await admin.from("prostec_conversas").update({ propriedade: "human", ultima_mensagem_em: new Date().toISOString() }).eq("id", conversa.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao processar mensagem de saída da Prostec:", err);
    return NextResponse.json({ ok: false });
  }
}
