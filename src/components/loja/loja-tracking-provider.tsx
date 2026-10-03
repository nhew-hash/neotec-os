"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { metaPixelPageView, metaPixelViewContent, metaPixelAddToCart, metaPixelInitiateCheckout, metaPixelLead, metaPixelContact, obterAtribuicaoCompleta, obterFbcFbp } from "@/lib/meta-pixel";

const CHAVE_SESSAO = "neotec_sessao_uid";
const CHAVE_ORIGEM = "neotec_origem";
const CHAVE_UTM = "neotec_utm";
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

/**
 * Fase 255: `utm_medium`/`utm_campaign` chegavam na URL e eram
 * descartados — só `utm_source` (via `obterOrigem`) ia pro banco.
 * Mesma lógica de "captura na 1ª visita, guarda no localStorage": uma
 * campanha só é atribuída à sessão que de fato clicou nela.
 *
 * Fase 262: mantido (compatibilidade com o shape já salvo em
 * localStorage por sessões antigas), mas a captura completa
 * (utm_source/content/term + fbclid/gclid) agora vive em
 * `obterAtribuicaoCompleta()` (lib/meta-pixel.ts) — reaproveitada
 * aqui, não duplicada.
 */
function obterUtm(): { utmMedium: string | null; utmCampaign: string | null } {
  const salvo = localStorage.getItem(CHAVE_UTM);
  if (salvo) {
    try {
      return JSON.parse(salvo);
    } catch {
      // valor salvo corrompido — recaptura da URL abaixo
    }
  }

  const params = new URLSearchParams(window.location.search);
  const resultado = { utmMedium: params.get("utm_medium"), utmCampaign: params.get("utm_campaign") };
  localStorage.setItem(CHAVE_UTM, JSON.stringify(resultado));
  return resultado;
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
export function rastrearAddToCart(input: { produtoId?: string; aparelhoId?: string; lacradoModeloId?: string; nome?: string; valor?: number; quantidade?: number }) {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo: "add_to_cart", sessaoUid, pagina: window.location.pathname, ...input });

  const contentId = input.produtoId ?? input.aparelhoId ?? input.lacradoModeloId;
  metaPixelAddToCart({ contentIds: contentId ? [contentId] : [], contentName: input.nome, value: input.valor, quantity: input.quantidade ?? 1 });
}

/** Fase 256 — clique específico em "Comprar Agora" na página Produto Quente, separado de `add_to_cart` (que o mesmo clique já dispara via `adicionar()`) pra dar visibilidade própria a esse CTA no funil, sem duplicar a contagem de "adicionar ao carrinho". */
export function rastrearComprarAgora() {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo: "comprar_agora_click", sessaoUid, pagina: window.location.pathname });
}

/**
 * Eventos do funil de checkout — pra conseguir medir de verdade onde o
 * cliente desiste, não só supor. "checkout_started" (cliente confirmou
 * dados e foi pra tela de pagamento) é o gatilho de InitiateCheckout
 * do Meta Pixel — ainda não é o pedido (que só é criado quando o
 * cliente escolhe Pix ou Cartão), mas é o sinal mais próximo que esta
 * camada já tinha antes da Fase 262. O InitiateCheckout "oficial"
 * (com valor/itens certos) é disparado à parte, pelo checkout/page.tsx,
 * assim que o pedido é de fato criado no servidor — ver `criarPedidoParaCheckout`.
 */
export function rastrearEventoCheckout(tipo: "checkout_view" | "checkout_started" | "payment_selected" | "payment_success" | "payment_failed") {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo, sessaoUid, pagina: window.location.pathname });
}

/** Lead — fechamento de pedido via WhatsApp (sem pagamento online). Ver `carrinho/page.tsx`. */
export function rastrearLead(input: { contentName: string; value?: number }) {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo: "lead", sessaoUid, pagina: window.location.pathname });
  metaPixelLead(input);
}

/** Contact — clique genérico em "falar no WhatsApp" fora do fluxo de fechamento de pedido (footer, página de erro, etc). */
export function rastrearContact() {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  void enviar({ tipo: "contact", sessaoUid, pagina: window.location.pathname });
  metaPixelContact();
}

/**
 * InitiateCheckout "oficial" — disparado quando o pedido já foi criado
 * de verdade no servidor (`criarPedidoParaCheckout`), com os dados
 * reais (valor autoritativo, itens, event_id = pedidoId pro CAPI
 * deduplicar com o mesmo evento enviado pelo servidor).
 */
export function rastrearInitiateCheckout(input: { contentIds: string[]; value: number; numItems: number }, pedidoId: string) {
  metaPixelInitiateCheckout(input, { eventID: pedidoId });
}

/**
 * Fase 255: o pageview automático (efeito de pathname, abaixo) nunca
 * carrega produto_id/aparelho_id — só sabe a URL. Sem isso, "Produtos
 * mais acessados" nunca teria visualização nenhuma, pra nenhum
 * produto, por construção (confirmado ao vivo). Páginas de produto
 * chamam isso ALÉM do pageview automático.
 *
 * Usa um `tipo` próprio (`product_view`), não `pageview` — de propósito.
 * O provider já dispara seu pageview genérico assim que a rota muda,
 * antes de qualquer componente da própria página rodar seu efeito (o
 * provider fica mais alto na árvore, e o React roda efeitos de baixo
 * pra cima); duplicar como "pageview" contaria a mesma visita 2x no
 * card "Visualizações" (que soma todo `tipo=pageview`, sem filtrar por
 * produto). Como tipo separado, a contagem total nunca duplica e a
 * atribuição por produto fica sempre certa, sem depender de ordem
 * entre componentes.
 */
export function rastrearVisualizacaoProduto(input: { produtoId?: string; aparelhoId?: string; lacradoModeloId?: string; nome?: string; valor?: number }) {
  const sessaoUid = localStorage.getItem(CHAVE_SESSAO);
  if (!sessaoUid) return;
  const { nome, valor, ...paraEnviar } = input;
  void enviar({ tipo: "product_view", sessaoUid, pagina: window.location.pathname, ...paraEnviar });

  const contentId = input.produtoId ?? input.aparelhoId ?? input.lacradoModeloId;
  metaPixelViewContent({ contentIds: contentId ? [contentId] : [], contentName: nome, value: valor });
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
    const { utmMedium, utmCampaign } = obterUtm();
    const atribuicao = obterAtribuicaoCompleta();
    const { fbc, fbp } = obterFbcFbp(atribuicao.fbclid);
    void enviar({
      tipo: "pageview", sessaoUid: sessaoUidRef.current, pagina: pathname, origem, utmMedium, utmCampaign,
      utmSource: atribuicao.utmSource, utmContent: atribuicao.utmContent, utmTerm: atribuicao.utmTerm,
      fbclid: atribuicao.fbclid, gclid: atribuicao.gclid, fbc, fbp,
    });
    // O script base do Pixel (meta-pixel-script.tsx) já dispara o
    // PageView da 1ª carga; aqui cobre as trocas de rota seguintes
    // (SPA do Next não recarrega a página, então o Pixel nunca saberia
    // da navegação sem isso).
    metaPixelPageView();
  }, [pathname]);

  return null;
}
