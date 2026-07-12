import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { receberMensagemWebhook } from "@/services/whatsapp/whatsapp.service";
import { registrarLog } from "@/services/whatsapp/whatsapp.logs";
import type { MetaWebhookPayload } from "@/services/whatsapp/whatsapp.types";

/**
 * Webhook oficial da Meta WhatsApp Cloud API. Segue exatamente o padrão
 * documentado pela Meta:
 *
 * - GET  → handshake de verificação (Meta chama isso uma vez, ao
 *          configurar o webhook no Business Manager).
 * - POST → notificações de mensagens/status recebidas em tempo real.
 *
 * Funciona de forma independente de `WHATSAPP_INTEGRACAO_ATIVA` (que
 * controla apenas o ENVIO — ver whatsapp.api.ts). Isto é, o sistema pode
 * já estar recebendo e persistindo mensagens reais mesmo antes de o
 * envio automático estar ligado — a equipe responde manualmente até lá.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Token de verificação inválido", { status: 403 });
}

function assinaturaValida(bodyRaw: string, assinatura: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  // Sem app secret configurado (integração ainda não ativada de verdade),
  // não há como validar — deixa passar, mas registra no log para não
  // mascarar essa lacuna quando a integração for ligada de verdade.
  if (!appSecret) return true;
  if (!assinatura) return false;

  const hashEsperado = "sha256=" + createHmac("sha256", appSecret).update(bodyRaw).digest("hex");
  const bufferA = Buffer.from(hashEsperado);
  const bufferB = Buffer.from(assinatura);
  if (bufferA.length !== bufferB.length) return false;

  return timingSafeEqual(bufferA, bufferB);
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.text();
  const assinatura = request.headers.get("x-hub-signature-256");

  if (!assinaturaValida(bodyRaw, assinatura)) {
    await registrarLog({
      direcao: "entrada",
      evento: "webhook_assinatura_invalida",
      payload: {},
      sucesso: false,
      erro: "Assinatura X-Hub-Signature-256 não confere",
    });
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(bodyRaw);
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const { value } = change;
        const nomeContato = value.contacts?.[0]?.profile?.name;

        for (const mensagem of value.messages ?? []) {
          await receberMensagemWebhook(mensagem.from, nomeContato, mensagem);
        }

        // Status de entrega/leitura (sent/delivered/read/failed) — a
        // atualização de `status_entrega` das mensagens de saída fica
        // preparada aqui para quando o envio real estiver ativo; hoje
        // não há mensagens de saída reais para casar o status.
        for (const status of value.statuses ?? []) {
          await registrarLog({
            direcao: "entrada",
            evento: "webhook_status",
            payload: { status },
            sucesso: true,
          });
        }
      }
    }
  } catch (err) {
    await registrarLog({
      direcao: "entrada",
      evento: "webhook_erro_processamento",
      payload: { erro: err instanceof Error ? err.message : String(err) },
      sucesso: false,
      erro: err instanceof Error ? err.message : "Erro desconhecido",
    });
    // Mesmo com erro no processamento, responde 200 — é o comportamento
    // recomendado pela Meta para evitar que ela fique reenviando o mesmo
    // evento indefinidamente. O erro já ficou registrado no log acima.
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
