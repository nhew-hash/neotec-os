import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

import { receberMensagemNormalizada } from "@/services/whatsapp/whatsapp.service";
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



function assinaturaValida(
  bodyRaw: string,
  assinatura: string | null
): boolean {


  const appSecret = process.env.WHATSAPP_APP_SECRET;


  if (!appSecret) {
    return true;
  }


  if (!assinatura) {
    return false;
  }


  const hashEsperado =
    "sha256=" +
    createHmac(
      "sha256",
      appSecret
    )
      .update(bodyRaw)
      .digest("hex");


  const bufferA = Buffer.from(hashEsperado);
  const bufferB = Buffer.from(assinatura);


  if (
    bufferA.length !== bufferB.length
  ) {
    return false;
  }


  return timingSafeEqual(
    bufferA,
    bufferB
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



  if (
    !assinaturaValida(
      bodyRaw,
      assinatura
    )
  ) {


    await registrarLog({
      direcao: "entrada",
      evento: "webhook_assinatura_invalida",
      payload: {},
      sucesso: false,
      erro:
        "Assinatura X-Hub-Signature-256 inválida",
    });


    return new NextResponse(
      "Assinatura inválida",
      {
        status: 401
      }
    );

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



        for (
          const status of value.statuses ?? []
        ) {


          await registrarLog({

            direcao:"entrada",

            evento:"webhook_status",

            payload:{
              status
            },

            sucesso:true

          });


        }


      }


    }



  } catch(err) {


    await registrarLog({

      direcao:"entrada",

      evento:"webhook_erro_processamento",

      payload:{
        erro:
          err instanceof Error
            ? err.message
            : String(err)
      },

      sucesso:false,

      erro:
        err instanceof Error
          ? err.message
          : "Erro desconhecido"

    });


  }



  return new NextResponse(
    "EVENT_RECEIVED",
    {
      status:200
    }
  );

}