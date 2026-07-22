/**
 * Eventos que disparam comunicação com o cliente.
 */
export type EventoWhatsapp =
  | "nova_os"
  | "diagnostico"
  | "orcamento"
  | "aprovacao"
  | "pronto"
  | "venda"
  | "garantia"
  | "aniversario"
  | "cashback"
  | "retorno";


export interface DisparoWhatsapp {
  evento: EventoWhatsapp;
  clienteId: string;
  telefone: string;
  variaveis: Record<string, string>;
}


// ---- Tipos de mensageria ----

export type {
  WhatsappConversa,
  WhatsappMensagem,
  WhatsappTemplate,
  WhatsappLog,
  DirecaoMensagem,
  TipoMensagemWhatsapp,
  StatusEntregaMensagem,
  StatusConversaWhatsapp,
  StatusAprovacaoTemplate,
} from "@/types";


// ---- Mensagem recebida pela Meta ----

export interface MetaWebhookMensagem {
  from: string;
  id: string;
  timestamp: string;

  type:
    | "text"
    | "image"
    | "document"
    | "audio";

  text?: {
    body: string;
  };

  image?: {
    id: string;
    caption?: string;
  };

  document?: {
    id: string;
    filename?: string;
  };

  audio?: {
    id: string;
  };
}

// ---- Payload completo Webhook Meta ----

export interface MetaWebhookPayload {
  object: string;

  entry: {
    id: string;

    changes: {
      field: string;

      value: {
        messaging_product: "whatsapp";

        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };

        contacts?: {
          profile: {
            name: string;
          };
          wa_id: string;
        }[];

        messages?: MetaWebhookMensagem[];

        statuses?: MetaWebhookStatus[];
      };
    }[];
  }[];
}



export interface MetaWebhookStatus {
  id: string;

  status:
    | "sent"
    | "delivered"
    | "read"
    | "failed";

  timestamp: string;

  recipient_id: string;
}



// ---- Envio texto Meta API ----

export interface MetaEnviarTextoPayload {
  messaging_product: "whatsapp";

  to: string;

  type: "text";

  text: {
    body: string;
  };
}



// ---- Envio template Meta API ----

export interface MetaEnviarTemplatePayload {
  messaging_product: "whatsapp";

  to: string;

  type: "template";

  template: {
    name: string;

    language: {
      code: string;
    };

    components?: {
      type: string;

      parameters: {
        type: string;
        text: string;
      }[];
    }[];
  };
}



// ---- Retorno API ----

export interface ResultadoEnvioWhatsapp {
  enviado: boolean;

  motivo?: string;

  whatsappMessageId?: string;
}
/**
 * Formato normalizado de mensagem recebida — independente de provedor.
 * O webhook da Meta traduz o payload dela pra este formato antes de
 * chamar `receberMensagemNormalizada`; o endpoint que recebe evento do
 * Bridge do WhatsApp Web faz a mesma tradução do lado dele. A lógica de
 * "achar/criar cliente, abrir conversa, rodar automação" fica uma vez só.
 */
export interface MensagemRecebidaNormalizada {
  telefone: string;
  nomeContato?: string;
  tipo: "texto" | "imagem" | "documento" | "audio";
  conteudo: string;
  idExterno: string;
  /**
   * JID completo de origem (com @lid ou @s.whatsapp.net) — só o
   * WhatsApp Web preenche isso. Usado pra responder direto quando o
   * telefone real não está disponível (contas migradas pra LID).
   */
  jidOriginal?: string;
  /** Bytes da mídia em base64 — só presente quando tipo é imagem/audio/documento e o provedor conseguiu baixar o arquivo. */
  midiaBase64?: string;
  midiaMimeType?: string;
}
