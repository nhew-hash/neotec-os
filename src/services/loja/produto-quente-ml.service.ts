/**
 * Fase 256 — extração "best-effort" de um anúncio de referência (ex:
 * Mercado Livre) pro recurso Produto Quente.
 *
 * O projeto NÃO tem (e não ganha aqui) nenhuma ferramenta de scraping
 * de página dinâmica (sem Playwright/Puppeteer em produção) — então
 * isso NUNCA tenta renderizar JavaScript. Só faz um fetch simples do
 * HTML e lê o que já vem pronto nele: meta tags Open Graph e o bloco
 * JSON-LD (`application/ld+json`) que o Mercado Livre (e a maioria dos
 * marketplaces) publica com dados estruturados do produto — pensado
 * originalmente pra Google, não pra nós, mas é público e é exatamente
 * o tipo de dado estruturado que precisamos.
 *
 * Filosofia igual à do `site-analyzer.ts` (Prostec): nunca inventa,
 * só extrai o que está literalmente na página. Se o fetch falhar, se a
 * página não tiver esses dados, ou se vier bloqueada (marketplaces
 * grandes costumam ter proteção anti-bot), a função devolve `null` —
 * o cadastro do Produto Quente NUNCA trava por causa disso, e a IA
 * (chamada depois) simplesmente gera o conteúdo só com os dados reais
 * já cadastrados no produto.
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 500_000;

export interface ResumoAnuncioReferencia {
  titulo: string | null;
  descricao: string | null;
  imagem: string | null;
  precoTexto: string | null;
  /** Texto solto de specs/perguntas encontrado no JSON-LD, quando existir — nunca inventado, só o que veio literalmente na página. */
  detalhesAdicionais: string | null;
}

async function fetchHtmlCapped(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NeotecOS-ProdutoQuente/1.0; +https://neotecbrasil.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return (await res.text()).slice(0, MAX_BYTES);

    const decoder = new TextDecoder("utf-8");
    let html = "";
    let bytes = 0;
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => undefined);
    return html;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function extrairMeta(html: string, propriedade: string): string | null {
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${propriedade}["'][^>]+content=["']([^"']+)["']`, "i");
  return html.match(regex)?.[1]?.trim() || null;
}

/** Lê o(s) bloco(s) JSON-LD (`application/ld+json`) e devolve o primeiro que parecer um Product — é onde marketplaces costumam publicar preço/nome/descrição de forma estruturada. */
export function extrairJsonLdProduct(html: string): Record<string, unknown> | null {
  const blocos = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const bloco of blocos) {
    try {
      const dado = JSON.parse(bloco[1].trim());
      const candidatos = Array.isArray(dado) ? dado : [dado];
      for (const c of candidatos) {
        const tipo = c?.["@type"];
        if (tipo === "Product" || (Array.isArray(tipo) && tipo.includes("Product"))) return c;
      }
    } catch {
      // bloco JSON-LD malformado ou não é o que procuramos — ignora e tenta o próximo
    }
  }
  return null;
}

/**
 * Tenta extrair título, descrição, imagem e preço do anúncio de
 * referência. Devolve `null` se não conseguir nada útil — quem chama
 * deve tratar isso como "sem dado extra", nunca como erro fatal.
 */
export async function extrairResumoAnuncioReferencia(url: string): Promise<ResumoAnuncioReferencia | null> {
  let urlValida: URL;
  try {
    urlValida = new URL(url);
  } catch {
    return null;
  }
  if (urlValida.protocol !== "https:" && urlValida.protocol !== "http:") return null;

  const html = await fetchHtmlCapped(urlValida.toString());
  if (!html) return null;

  const jsonLd = extrairJsonLdProduct(html);
  const jsonLdOfertas = jsonLd?.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const oferta = Array.isArray(jsonLdOfertas) ? jsonLdOfertas[0] : jsonLdOfertas;

  const titulo = (jsonLd?.name as string) || extrairMeta(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;
  const descricao = (jsonLd?.description as string) || extrairMeta(html, "og:description") || null;
  const imagem = (Array.isArray(jsonLd?.image) ? (jsonLd?.image as string[])[0] : (jsonLd?.image as string)) || extrairMeta(html, "og:image") || null;
  const precoTexto = oferta?.price != null ? String(oferta.price) : extrairMeta(html, "product:price:amount");

  if (!titulo && !descricao && !precoTexto) return null; // nada de útil — degrada com elegância

  return {
    titulo: titulo?.slice(0, 300) ?? null,
    descricao: descricao?.slice(0, 2000) ?? null,
    imagem,
    precoTexto,
    detalhesAdicionais: null,
  };
}
