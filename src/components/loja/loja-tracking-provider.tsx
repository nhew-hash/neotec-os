"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const CHAVE_SESSAO = "neotec_sessao_uid";
const CHAVE_ORIGEM = "neotec_origem";
const INTERVALO_PING_MS = 60_000;

function obterOuCriarSessaoUid(): string {
  let uid = localStorage.getItem(CHAVE_SESSAO);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(CHAVE_SESSAO, uid);
  }
  return uid;
}

function obterOrigem(): string {
  const salva = localStorage.getItem(CHAVE_ORIGEM);
  if (salva) return salva;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source")?.toLowerCase();
  const referrer = document.referrer.toLowerCase();

  let origem = "direto";
  if (utmSource?.includes("meta") || utmSource?.includes("facebook") || utmSource?.includes("instagram")) origem = "meta_ads";
  else if (utmSource) origem = utmSource;
  else if (referrer.includes("instagram")) origem = "instagram";
  else if (referrer.includes("google")) origem = "google";
  else if (referrer.includes("whatsapp") || referrer.includes("wa.me")) origem = "whatsapp";
  else if (referrer) origem = "outros";

  localStorage.setItem(CHAVE_ORIGEM, origem);
  return origem;
}

async function enviar(payload: Record<string, unknown>) {
  try {
    await fetch("/api/loja/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // rastreamento nunca pode quebrar a navegação do cliente
  }
}

/** Dispara evento de "produto adicionado ao carrinho" — chamado pelos componentes de carrinho existentes. */
export function rastrearAddToCart(input: { produtoId?: string; aparelhoId?: string }) {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo: "add_to_cart", sessaoUid, pagina: window.location.pathname, ...input });
}

/** Eventos do funil de checkout — pra conseguir medir de verdade onde o cliente desiste, não só supor. */
export function rastrearEventoCheckout(tipo: "checkout_view" | "checkout_started" | "payment_selected" | "payment_success" | "payment_failed") {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo, sessaoUid, pagina: window.location.pathname });
}

export function LojaTrackingProvider() {
  const pathname = usePathname();
  const sessaoUidRef = useRef<string | null>(null);

  useEffect(() => {
    sessaoUidRef.current = obterOuCriarSessaoUid();
    const origem = obterOrigem();

    const intervalo = setInterval(() => {
      if (sessaoUidRef.current) void enviar({ tipo: "ping", sessaoUid: sessaoUidRef.current, origem });
    }, INTERVALO_PING_MS);

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!sessaoUidRef.current) return;
    const origem = obterOrigem();
    void enviar({ tipo: "pageview", sessaoUid: sessaoUidRef.current, pagina: pathname, origem });
  }, [pathname]);

  return null;
}
