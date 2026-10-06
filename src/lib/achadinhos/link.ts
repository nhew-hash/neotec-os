import type { OrigemAfiliado } from "./tipos";

/**
 * Hosts aceitos como destino do botão de compra, por origem. É a trava
 * contra "open redirect": a rota `/achadinhos/ir/[slug]` redireciona o
 * visitante pra `link_afiliado`, então ele NUNCA pode apontar pra um site
 * qualquer — mesmo que alguém (ou o Claude) cadastre um link errado, ou o
 * banco seja adulterado.
 *
 * Pra aceitar outro marketplace no futuro: adicionar a origem aqui, em
 * `ORIGEM_LABEL` e em `tipos.ts`.
 */
export const HOSTS_POR_ORIGEM: Record<OrigemAfiliado, string[]> = {
  mercado_livre: ["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com", "meli.la"],
};

export const ORIGEM_LABEL: Record<OrigemAfiliado, string> = {
  mercado_livre: "Mercado Livre",
};

export const ORIGENS = Object.keys(HOSTS_POR_ORIGEM) as OrigemAfiliado[];

export type ResultadoLink = { ok: true; url: string } | { ok: false; erro: string };

export function validarLinkAfiliado(bruto: string, origem: OrigemAfiliado = "mercado_livre"): ResultadoLink {
  const texto = bruto.trim();
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return { ok: false, erro: "Link de afiliado inválido (não é uma URL)" };
  }
  if (url.protocol !== "https:") return { ok: false, erro: "O link de afiliado precisa começar com https://" };
  if (url.username || url.password) return { ok: false, erro: "Link de afiliado não pode conter usuário/senha" };

  const host = url.hostname.toLowerCase();
  const permitidos = HOSTS_POR_ORIGEM[origem] ?? [];
  const ok = permitidos.some((h) => host === h || host.endsWith(`.${h}`));
  if (!ok) {
    return { ok: false, erro: `Link fora dos domínios permitidos pra ${ORIGEM_LABEL[origem] ?? origem} (${permitidos.join(", ")})` };
  }
  // Devolve o texto original (só sem espaços nas pontas) — normalizar a URL
  // poderia mexer em parâmetros do link de afiliado.
  return { ok: true, url: texto };
}

/** Imagem/vídeo: qualquer https público (Supabase Storage, CDN do Mercado Livre, YouTube...). */
export function urlMidiaValida(bruto: string): boolean {
  try {
    const url = new URL(bruto.trim());
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
