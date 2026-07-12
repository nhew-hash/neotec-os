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
  id: string;

  type:
    | "text"
    | "image"
    | "document"
    | "audio";

  text?: {
    body: string;
  };

  image?: {
    caption?: string;
  };

  document?: {
    filename?: string;
  };

  audio?: {
    id?: string;
  };
}


// ---- Payload completo Webhook Meta ----

export interface MetaWebhookPayload {
  object: "whatsapp_business_account";

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