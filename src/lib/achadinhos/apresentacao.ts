import type { ProdutoPublico } from "./tipos";

/**
 * Regras de exibição do site público. A mais importante: o desconto que
 * aparece é SEMPRE o que foi informado no cadastro — nunca calculado aqui.
 * (O cadastro já garante, em `schemas.ts`, que ele bate com os preços.)
 */
export function descontoExibido(p: Pick<ProdutoPublico, "desconto_percentual">): number | null {
  const d = p.desconto_percentual;
  return d != null && d > 0 ? Math.round(d) : null;
}

/** O preço riscado só aparece quando existe de fato um preço anterior MAIOR que o atual. */
export function precoAnteriorExibido(p: Pick<ProdutoPublico, "preco_atual" | "preco_anterior">): number | null {
  const { preco_atual: atual, preco_anterior: anterior } = p;
  if (anterior == null || atual == null) return null;
  return anterior > atual ? anterior : null;
}

export type VideoIncorporavel =
  | { tipo: "youtube"; id: string }
  | { tipo: "arquivo"; url: string }
  | { tipo: "link"; url: string };

const ID_YOUTUBE = /^[\w-]{11}$/;

export function interpretarVideo(bruto: string | null | undefined): VideoIncorporavel | null {
  if (!bruto) return null;
  let url: URL;
  try {
    url = new URL(bruto.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(url.pathname);
      if (m) id = m[1];
    }
  }
  if (id !== null) return ID_YOUTUBE.test(id) ? { tipo: "youtube", id } : null;

  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return { tipo: "arquivo", url: url.toString() };
  return { tipo: "link", url: url.toString() };
}

/** Todas as imagens da galeria, sem repetir e com a principal primeiro. */
export function imagensDaGaleria(p: Pick<ProdutoPublico, "imagem_principal" | "imagens">): string[] {
  const todas = [p.imagem_principal, ...(p.imagens ?? [])].filter((u): u is string => !!u);
  return [...new Set(todas)];
}

/** Limpa um parâmetro vindo da URL antes de gravar: sem caracteres de controle e com tamanho limitado. */
export function limparParametro(valor: string | null | undefined, max = 120): string | null {
  if (!valor) return null;
  // eslint-disable-next-line no-control-regex
  const limpo = valor.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
  return limpo || null;
}

/** Caminho interno do botão de compra — passa pela rota que registra o clique. */
export function caminhoCompra(slug: string, origemClique: string, pagina: string, utms: Record<string, string | null | undefined> = {}): string {
  const q = new URLSearchParams();
  q.set("o", origemClique);
  q.set("p", pagina);
  for (const chave of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const v = limparParametro(utms[chave]);
    if (v) q.set(chave, v);
  }
  return `/achadinhos/ir/${encodeURIComponent(slug)}?${q.toString()}`;
}

export function urlSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://neotecbrasil.com").replace(/\/+$/, "");
}

export function urlPublicaProduto(slug: string): string {
  return `${urlSite()}/achadinhos/${slug}`;
}
