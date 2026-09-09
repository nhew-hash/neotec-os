import { NextResponse, type NextRequest } from "next/server";
import { bridgeAutenticado } from "@/services/whatsapp/providers/bridge-auth";
import { receberMensagemNormalizada } from "@/services/whatsapp/whatsapp.service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MensagemRecebidaNormalizada } from "@/services/whatsapp/whatsapp.types";

/**
 * O Bridge chama isso a cada mensagem nova recebida pelo WhatsApp Web.
 * Já chega em formato normalizado (o Bridge traduz do formato do
 * Baileys pra este formato antes de mandar) — daqui pra frente é
 * exatamente o mesmo caminho que uma mensagem da Meta percorre.
 */
export async function POST(request: NextRequest) {
  if (!bridgeAutenticado(request)) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const body: MensagemRecebidaNormalizada = await request.json();

  try {
    await receberMensagemNormalizada(body);

    // Contador de "mensagens hoje" do card do Dashboard.
    const supabase = createAdminClient();
    await supabase.rpc("incrementar_mensagens_hoje_whatsapp_web");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
