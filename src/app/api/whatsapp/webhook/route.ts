import { NextResponse, type NextRequest } from "next/server";

import { receberMensagemNormalizada, atualizarStatusEntrega } from "@/services/whatsapp/whatsapp.service";
import { verificarAssinaturaMeta } from "@/services/whatsapp/webhook-assinatura";
import { registrarLog } from "@/services/whatsapp/whatsapp.logs";

import type {
  MetaWebhookPayload,
  MetaWebhookMensagem,
  MensagemRecebidaNormalizada,
} from "@/services/whatsapp/whatsapp.types";

/** Traduz o formato específico da Meta pro formato normalizado, compartilhado entre provedores. */
function normalizarMensagemMeta(mensagem: MetaWebhookMensagem, nomeContato: string | undefined): MensagemRecebidaNormalizada {
  const conteudo =
    mensagem.type === "text" ? mensagem.text?.body ?? "" :
    mensagem.type === "image" ? (mensagem.image?.caption ?? "[Imagem]") :
    mensagem.type === "document" ? (mensagem.document?.filename ?? "[Documento]") :
    "[Áudio]";

  const tipo =
    mensagem.type === "text" ? "texto" :
    mensagem.type === "image" ? "imagem" :
    mensagem.type === "document" ? "documento" : "audio";

  return { telefone: mensagem.from, nomeContato, tipo, conteudo, idExterno: mensagem.id };
}


/**
 * Webhook oficial da Meta WhatsApp Cloud API.
 *
 * GET:
 * - Validação inicial do webhook pela Meta.
 *
 * POST:
 * - Recebe mensagens novas.
 * - Salva conversa.
 * - Executa automações CRM.
 */


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");


  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {

    return new NextResponse(challenge, {
      status: 200
    });

  }


  return new NextResponse(
    "Token de verificação inválido",
    {
      status: 403
    }
  );

}



export async function POST(
  request: NextRequest
) {


  const bodyRaw = await request.text();

  const assinatura =
    request.headers.get(
      "x-hub-signature-256"
    );



  const verificacao = verificarAssinaturaMeta({
    corpo: bodyRaw,
    assinatura,
    segredo: process.env.WHATSAPP_APP_SECRET,
    permitirSemAssinatura: process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED === "true",
    producao: process.env.NODE_ENV === "production",
  });

  if (!verificacao.valida) {
    await registrarLog({
      direcao: "entrada",
      evento: "webhook_assinatura_invalida",
      payload: { motivo: verificacao.motivo },
      sucesso: false,
      erro: verificacao.motivo === "segredo_ausente"
        ? "WHATSAPP_APP_SECRET não configurado — webhook recusado (fail-closed)"
        : "Assinatura X-Hub-Signature-256 inválida ou ausente",
    });
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  let payload: MetaWebhookPayload;

  try {

    payload =
      JSON.parse(bodyRaw);

  } catch {


    return new NextResponse(
      "JSON inválido",
      {
        status:400
      }
    );

  }



  try {


    for (
      const entry of payload.entry ?? []
    ) {


      for (
        const change of entry.changes ?? []
      ) {


        const value =
          change.value;


        const nomeContato =
          value.contacts?.[0]?.profile?.name;



        for (
          const mensagem of value.messages ?? []
        ) {


          await receberMensagemNormalizada(
            normalizarMensagemMeta(mensagem, nomeContato)
          );


        }



        for (const status of value.statuses ?? []) {
          // Status de entrega da mensagem que o sistema enviou: agora
          // atualiza a mensagem no histórico (antes só ia para o log).
          const aplicado = await atualizarStatusEntrega({ whatsappMessageId: status.id, statusMeta: status.status });
          await registrarLog({
            direcao: "entrada",
            evento: "webhook_status",
            payload: { id: status.id, status: status.status, aplicado },
            sucesso: true,
          });
        }

      }


    }



  } catch(err) {
    await registrarLog({
      direcao: "entrada",
      evento: "webhook_erro_processamento",
      payload: { erro: err instanceof Error ? err.message : String(err) },
      sucesso: false,
      erro: err instanceof Error ? err.message : "Erro desconhecido",
    });
    // 500 de propósito: a Meta reenvia o evento. Como o recebimento agora é
    // idempotente (dedupe por whatsapp_message_id), o retry não duplica
    // nada — e uma falha transitória do banco não perde mais a mensagem
    // (antes, o 200 fazia a Meta desistir dela).
    return new NextResponse("Erro ao processar", { status: 500 });
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
