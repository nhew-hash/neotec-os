/**
 * Eventos que disparam comunicação com o cliente. Cada evento do sistema
 * (OS aberta, orçamento aprovado, aniversário...) deve passar por esta
 * camada — nunca formatar/enviar mensagem diretamente de dentro de um
 * service de domínio. Isso é o que torna trivial trocar "log local" por
 * "Meta WhatsApp Business API" no futuro sem tocar em Vendas, OS, etc.
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

// ---- Tipos de mensageria (Central de Comunicação — Fase 9) ----

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

/**
 * Formato do payload que a Meta Cloud API envia para o webhook ao
 * receber uma mensagem. Modelado a partir da documentação oficial
 * (Cloud API "Messages webhook") — só os campos que o sistema
 * efetivamente usa, não o payload completo.
 */
export interface MetaWebhookPayload {
  entry: {
    id: string;
    changes: {
      field: string;
      value: {
        messaging_product: "whatsapp";
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: MetaWebhookMensagem[];
        statuses?: MetaWebhookStatus[];
      };
    }[];
  }[];
}

export interface MetaWebhookMensagem {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio";
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string };
  audio?: { id: string; mime_type: string };
}

export interface MetaWebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

/** Payload de envio de mensagem de texto — formato oficial da Cloud API. */
export interface MetaEnviarTextoPayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string };
}

/** Payload de envio de template — formato oficial da Cloud API. */
export interface MetaEnviarTemplatePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: { type: string; parameters: { type: string; text: string }[] }[];
  };
}

export interface ResultadoEnvioWhatsapp {
  enviado: boolean;
  motivo?: string;
  whatsappMessageId?: string;
}
