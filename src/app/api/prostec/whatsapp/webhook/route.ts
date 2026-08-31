import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { processarMensagemRecebidaBot } from "@/services/prostec/whatsapp/prostec-bot.service";

/**
 * Webhook oficial da Meta WhatsApp Cloud API — SÓ da Prostec. Nunca
 * o mesmo endpoint do webhook da loja (`/api/whatsapp/webhook`) —
 * precisa ser configurado com o App/número PRÓPRIO da Prostec no
 * painel da Meta, com seu próprio verify token
 * (WHATSAPP_PROSTEC_VERIFY_TOKEN) e app secret
 * (WHATSAPP_PROSTEC_APP_SECRET).
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_PROSTEC_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Token de verificação inválido", { status: 403 });
}

function assinaturaValida(bodyRaw: string, assinatura: string | null): boolean {
  const appSecret = process.env.WHATSAPP_PROSTEC_APP_SECRET;
  if (!appSecret) return true; // sem secret configurado, não valida (mesmo padrão do webhook da loja)
  if (!assinatura) return false;

  const hashEsperado = "sha256=" + createHmac("sha256", appSecret).update(bodyRaw).digest("hex");
  const bufferA = Buffer.from(hashEsperado);
  const bufferB = Buffer.from(assinatura);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

interface MetaWebhookMensagemTexto { from: string; id: string; type: string; text?: { body: string } }

export async function POST(request: NextRequest) {
  const bodyRaw = await request.text();
  const assinatura = request.headers.get("x-hub-signature-256");

  if (!assinaturaValida(bodyRaw, assinatura)) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  try {
    const payload = JSON.parse(bodyRaw);

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        for (const mensagem of (value.messages ?? []) as MetaWebhookMensagemTexto[]) {
          if (mensagem.type !== "text" || !mensagem.text?.body) continue; // bot só entende texto por enquanto
          await processarMensagemRecebidaBot(mensagem.from, mensagem.text.body);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook WhatsApp Prostec:", err);
    // Sempre 200 pra Meta não ficar re-tentando infinitamente por um erro nosso.
    return NextResponse.json({ ok: false });
  }
}
