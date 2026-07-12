import type {
  MetaEnviarTextoPayload,
  MetaEnviarTemplatePayload,
  ResultadoEnvioWhatsapp,
} from "./whatsapp.types";

/**
 * Cliente HTTP da Meta WhatsApp Cloud API (padrão oficial — nunca uma
 * biblioteca não-oficial, por decisão explícita da missão).
 *
 * A integração real fica DESLIGADA por padrão: `integracaoAtiva()` só
 * retorna true se as três variáveis de ambiente abaixo estiverem
 * configuradas. Enquanto isso, `enviarTexto`/`enviarTemplate` não fazem
 * nenhuma chamada de rede — apenas retornam `{ enviado: false }` para
 * quem chamou registrar o resultado (ver whatsapp.service.ts).
 *
 * Isso segue o mesmo princípio já usado em `fila_notificacoes`
 * (status "desativado" por padrão): a arquitetura está pronta, ligar a
 * integração de verdade é só configurar as credenciais.
 */

const META_API_VERSION = "v20.0";

function integracaoAtiva(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_INTEGRACAO_ATIVA === "true"
  );
}

function endpointEnvio(): string {
  return `https://graph.facebook.com/${META_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

async function chamarMetaApi(payload: MetaEnviarTextoPayload | MetaEnviarTemplatePayload): Promise<ResultadoEnvioWhatsapp> {
  if (!integracaoAtiva()) {
    return { enviado: false, motivo: "Integração com a Meta Cloud API ainda não está ativada" };
  }

  try {
    const response = await fetch(endpointEnvio(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { enviado: false, motivo: data?.error?.message ?? "Erro desconhecido da API da Meta" };
    }

    return { enviado: true, whatsappMessageId: data?.messages?.[0]?.id };
  } catch (err) {
    return { enviado: false, motivo: err instanceof Error ? err.message : "Falha de rede ao chamar a Meta Cloud API" };
  }
}

export function montarPayloadTexto(telefone: string, texto: string): MetaEnviarTextoPayload {
  return {
    messaging_product: "whatsapp",
    to: telefone,
    type: "text",
    text: { body: texto },
  };
}

export function montarPayloadTemplate(
  telefone: string,
  nomeTemplate: string,
  idioma: string,
  variaveis: string[]
): MetaEnviarTemplatePayload {
  return {
    messaging_product: "whatsapp",
    to: telefone,
    type: "template",
    template: {
      name: nomeTemplate,
      language: { code: idioma },
      components: variaveis.length > 0
        ? [{ type: "body", parameters: variaveis.map((v) => ({ type: "text", text: v })) }]
        : undefined,
    },
  };
}

export async function enviarTexto(telefone: string, texto: string): Promise<ResultadoEnvioWhatsapp> {
  return chamarMetaApi(montarPayloadTexto(telefone, texto));
}

export async function enviarTemplate(
  telefone: string,
  nomeTemplate: string,
  idioma: string,
  variaveis: string[]
): Promise<ResultadoEnvioWhatsapp> {
  return chamarMetaApi(montarPayloadTemplate(telefone, nomeTemplate, idioma, variaveis));
}

export { integracaoAtiva };
