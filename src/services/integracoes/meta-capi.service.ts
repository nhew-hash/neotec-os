import { createHash } from "crypto";

/**
 * Meta Conversions API (CAPI) — Fase 262.
 *
 * Único lugar do projeto que fala com a Graph API da Meta pra eventos
 * de servidor. Nunca é chamado do client; o token (`META_CAPI_ACCESS_TOKEN`)
 * só existe aqui e em variável de ambiente — nunca no frontend.
 *
 * Modo development: por padrão não envia nada de verdade (loga no
 * console e retorna) quando `NODE_ENV !== "production"`, pra nunca
 * poluir o Events Manager com testes locais. Pra forçar envio real em
 * dev (teste manual contra o Business Manager), defina
 * META_CAPI_FORCE_DEV=true.
 */

const GRAPH_API_VERSION = "v21.0";

function capiHabilitado(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  return process.env.META_CAPI_FORCE_DEV === "true";
}

function sha256(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export interface MetaCapiUserData {
  /** Telefone em dígitos puros (com ou sem 55) — função faz o hash e normaliza aqui dentro. */
  telefone?: string | null;
  email?: string | null;
  /** CPF (ou outro id estável do cliente) — vira `external_id` hasheado. */
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
}

export interface MetaCapiEventoInput {
  eventName: "Purchase" | "InitiateCheckout" | "Lead" | "AddToCart" | "ViewContent" | "Contact";
  /** Mesmo id usado pelo Browser Pixel pro mesmo evento lógico — é como a Meta deduplica. */
  eventId: string;
  eventSourceUrl: string;
  userData: MetaCapiUserData;
  customData?: Record<string, unknown>;
}

async function obterConfiguracao(): Promise<{ pixelId: string; accessToken: string } | null> {
  const pixelId = process.env.META_DATASET_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken };
}

/**
 * Envia um evento pro CAPI. NUNCA lança erro pra quem chamou — um
 * evento de marketing que falha não pode derrubar uma venda já
 * aprovada ou a criação de um pedido. Falhas vão só pro console.
 */
export async function enviarEventoMetaCapi(input: MetaCapiEventoInput): Promise<{ enviado: boolean; motivo?: string }> {
  try {
    const config = await obterConfiguracao();
    if (!config) return { enviado: false, motivo: "Meta Pixel/CAPI não configurado (META_DATASET_ID/NEXT_PUBLIC_META_PIXEL_ID + META_CAPI_ACCESS_TOKEN)" };

    if (!capiHabilitado()) {
      console.log(`[meta-capi] (dev, não enviado de verdade) ${input.eventName} event_id=${input.eventId}`);
      return { enviado: false, motivo: "Modo development — evento não enviado de verdade" };
    }

    const telefoneDigitos = input.userData.telefone?.replace(/\D/g, "") || null;

    const userData: Record<string, unknown> = {};
    if (input.userData.email) userData.em = [sha256(input.userData.email)];
    if (telefoneDigitos) userData.ph = [sha256(telefoneDigitos)];
    if (input.userData.externalId) userData.external_id = [sha256(input.userData.externalId)];
    if (input.userData.clientIpAddress) userData.client_ip_address = input.userData.clientIpAddress;
    if (input.userData.clientUserAgent) userData.client_user_agent = input.userData.clientUserAgent;
    if (input.userData.fbc) userData.fbc = input.userData.fbc;
    if (input.userData.fbp) userData.fbp = input.userData.fbp;

    const payload = {
      data: [
        {
          event_name: input.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          action_source: "website",
          event_source_url: input.eventSourceUrl,
          user_data: userData,
          custom_data: input.customData ?? {},
        },
      ],
    };

    const resposta = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pixelId}/events?access_token=${config.accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      console.error(`[meta-capi] Falha ao enviar ${input.eventName} (event_id=${input.eventId}): ${resposta.status} ${corpo}`);
      return { enviado: false, motivo: `Meta retornou ${resposta.status}` };
    }

    return { enviado: true };
  } catch (erro) {
    console.error(`[meta-capi] Erro inesperado ao enviar ${input.eventName}:`, erro);
    return { enviado: false, motivo: erro instanceof Error ? erro.message : "Erro desconhecido" };
  }
}
