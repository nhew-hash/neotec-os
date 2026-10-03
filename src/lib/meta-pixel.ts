"use client";

/**
 * Camada central do Meta Pixel (Fase 262 — fbq nunca é chamado fora
 * deste arquivo). Espelha exatamente os mesmos pontos de disparo da
 * camada de tracking interna (`loja-tracking-provider.tsx`) — não
 * substitui aquela, acrescenta o `fbq()` ao lado de cada evento que já
 * existia.
 *
 * Modo development: por padrão, `fbq` nem é injetado em
 * desenvolvimento (NODE_ENV !== "production"), pra nunca sujar o
 * Events Manager com teste local. Pra forçar eventos reais em dev
 * (teste manual), defina NEXT_PUBLIC_META_PIXEL_FORCE_DEV=true.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || null;

export function metaPixelHabilitado(): boolean {
  if (!META_PIXEL_ID) return false;
  if (process.env.NODE_ENV === "production") return true;
  return process.env.NEXT_PUBLIC_META_PIXEL_FORCE_DEV === "true";
}

function fbq(...args: unknown[]) {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq(...args);
  } catch {
    // Pixel nunca pode quebrar a navegação do cliente.
  }
}

/** Mesmo event_id usado no CAPI (servidor) pro Meta deduplicar Browser Pixel + CAPI automaticamente. */
type EventIdOptions = { eventID?: string };

export function metaPixelPageView() {
  fbq("track", "PageView");
}

export function metaPixelViewContent(input: { contentIds: string[]; contentName?: string; value?: number; currency?: string }) {
  fbq("track", "ViewContent", {
    content_ids: input.contentIds,
    content_type: "product",
    content_name: input.contentName,
    value: input.value,
    currency: input.currency ?? "BRL",
  });
}

export function metaPixelAddToCart(input: { contentIds: string[]; contentName?: string; value?: number; currency?: string; quantity?: number }) {
  fbq("track", "AddToCart", {
    content_ids: input.contentIds,
    content_type: "product",
    content_name: input.contentName,
    value: input.value,
    currency: input.currency ?? "BRL",
    quantity: input.quantity ?? 1,
  });
}

export function metaPixelInitiateCheckout(input: { contentIds: string[]; value: number; currency?: string; numItems: number }, opts?: EventIdOptions) {
  fbq("track", "InitiateCheckout", {
    content_ids: input.contentIds,
    value: input.value,
    currency: input.currency ?? "BRL",
    num_items: input.numItems,
  }, opts);
}

/**
 * Purchase — o evento mais importante (Fase 262, Fase 3 do briefing).
 * SÓ deve ser chamado a partir de um ponto que já confirmou o
 * pagamento de verdade com o servidor (ver checkout/page.tsx:
 * handlePagarCartao no branch "aprovado" e handlePixAprovado, ambos
 * acionados só depois de o Mercado Pago confirmar). `eventID` é
 * SEMPRE o id do pagamento (`pagamentoId`) — o mesmo enviado pelo CAPI
 * no servidor, pra deduplicação automática no Events Manager.
 */
export function metaPixelPurchase(
  input: { contentIds: string[]; value: number; currency?: string; numItems: number; orderId: string },
  opts: Required<EventIdOptions>
) {
  fbq("track", "Purchase", {
    content_ids: input.contentIds,
    content_type: "product",
    value: input.value,
    currency: input.currency ?? "BRL",
    num_items: input.numItems,
    order_id: input.orderId,
  }, opts);
}

export function metaPixelLead(input: { contentName: string; value?: number; currency?: string }) {
  fbq("track", "Lead", {
    content_name: input.contentName,
    value: input.value,
    currency: input.value != null ? input.currency ?? "BRL" : undefined,
  });
}

export function metaPixelContact() {
  fbq("track", "Contact");
}

// --- Captura e persistência de fbclid/fbc/fbp/UTMs (Fase 262, Fase 6) ----

const CHAVE_ATRIBUICAO = "neotec_atribuicao_meta";

export interface AtribuicaoCapturada {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  gclid: string | null;
}

function lerCookie(nome: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Captura a atribuição completa na PRIMEIRA visita (mesmo padrão já
 * usado por `obterOrigem`/`obterUtm` no tracking provider: guarda no
 * localStorage pra não perder quando o usuário navega pra outra
 * página sem esses parâmetros na URL). Clique novo com `fbclid`/UTM na
 * URL sempre sobrescreve a atribuição anterior — é um novo toque.
 */
export function obterAtribuicaoCompleta(): AtribuicaoCapturada {
  const params = new URLSearchParams(window.location.search);
  const temParametrosNovos = params.has("utm_source") || params.has("fbclid") || params.has("gclid") || params.has("utm_campaign");

  if (!temParametrosNovos) {
    const salvo = localStorage.getItem(CHAVE_ATRIBUICAO);
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch {
        // valor corrompido — recaptura abaixo
      }
    }
  }

  const resultado: AtribuicaoCapturada = {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    fbclid: params.get("fbclid"),
    gclid: params.get("gclid"),
  };
  localStorage.setItem(CHAVE_ATRIBUICAO, JSON.stringify(resultado));
  return resultado;
}

/**
 * `_fbc`/`_fbp` são cookies que o PRÓPRIO script do Meta Pixel cria no
 * navegador — não inventamos esse valor. Se o Pixel ainda não rodou
 * (ou o cliente bloqueia o cookie) mas existe um `fbclid` na URL,
 * derivamos o `fbc` no formato oficial da Meta
 * (`fb.1.<timestamp>.<fbclid>`) como fallback documentado pela própria
 * Meta pra CAPI, nunca um valor arbitrário.
 */
export function obterFbcFbp(fbclid: string | null): { fbc: string | null; fbp: string | null } {
  const fbpCookie = lerCookie("_fbp");
  let fbcCookie = lerCookie("_fbc");
  if (!fbcCookie && fbclid) {
    fbcCookie = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbc: fbcCookie, fbp: fbpCookie };
}
