/** Portado do Neotec Prospector original — analisa presença digital real via HTTP, nunca inventa dado. */

export type SiteQuality = "excelente" | "bom" | "fraco" | "inexistente";

export interface SiteAnalysis {
  possui_site: boolean;
  site_confiavel: boolean;
  acessivel: boolean | null;
  https: boolean | null;
  responsivo: boolean | null;
  aparencia_moderna: boolean | null;
  velocidade_aproximada: "rapida" | "media" | "lenta" | null;
  botao_whatsapp: boolean | null;
  formulario_contato: boolean | null;
  informacoes_empresa: boolean | null;
  cta_claro: boolean | null;
  pagina_servicos: boolean | null;
  seo_basico: boolean | null;
  data_atualizacao_aparente: string | null;
  classificacao: SiteQuality;
  analisado_em: string;
  /** Extraído do próprio HTML do site quando existe (link de rodapé/header) — nunca inventado, null quando não encontrado. */
  instagram_encontrado: string | null;
  /** Extraído de um link wa.me/NUMERO real no site — mais confiável que assumir que o telefone geral é WhatsApp. */
  whatsapp_encontrado: string | null;
}

/** Procura um link de Instagram real no HTML — nunca inventa, só extrai se realmente estiver lá. */
function extrairInstagramDoHtml(html: string): string | null {
  const match = html.match(/instagram\.com\/([a-zA-Z0-9_.]{2,30})/i);
  if (!match) return null;
  const handle = match[1].toLowerCase();
  if (["p", "reel", "explore", "accounts", "share"].includes(handle)) return null; // links de post/ação, não de perfil
  return `https://instagram.com/${handle}`;
}

/** Procura um link wa.me/NUMERO real no HTML — só extrai o que está literalmente lá, nunca deriva do telefone geral. */
function extrairWhatsappDoHtml(html: string): string | null {
  const match = html.match(/wa\.me\/(\d{10,15})/i);
  return match ? match[1] : null;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 300_000;

const CTA_PHRASES = [
  "fale conosco", "entre em contato", "solicite um orçamento", "solicite orçamento",
  "peça um orçamento", "agende", "agende agora", "compre agora", "saiba mais", "faça seu pedido", "peça já", "reserve",
];

function noSiteAnalysis(reliable: boolean, now: string): SiteAnalysis {
  return {
    possui_site: false, site_confiavel: reliable, acessivel: null, https: null, responsivo: null,
    aparencia_moderna: null, velocidade_aproximada: null, botao_whatsapp: null, formulario_contato: null,
    informacoes_empresa: null, cta_claro: null, pagina_servicos: null, seo_basico: null,
    data_atualizacao_aparente: null, classificacao: "inexistente", analisado_em: now, instagram_encontrado: null, whatsapp_encontrado: null,
  };
}

function classify(acessivel: boolean, positives: number): SiteQuality {
  if (!acessivel) return "fraco";
  if (positives >= 8) return "excelente";
  if (positives >= 5) return "bom";
  return "fraco";
}

async function fetchHtmlCapped(url: string): Promise<{ ok: boolean; finalUrl: string; html: string; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal, redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NeotecProspectorBot/1.0)", Accept: "text/html,application/xhtml+xml" },
    });
    const ms = Date.now() - started;
    if (!res.ok) return { ok: false, finalUrl: res.url || url, html: "", ms };
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { ok: true, finalUrl: res.url || url, html: text.slice(0, MAX_BYTES), ms };
    }
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
    return { ok: true, finalUrl: res.url || url, html, ms };
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeRealSite(website: string, now: string): Promise<SiteAnalysis> {
  let fetched;
  try {
    fetched = await fetchHtmlCapped(website);
  } catch {
    fetched = null;
  }

  if (!fetched || !fetched.ok) {
    return {
      possui_site: true, site_confiavel: true, acessivel: false, https: website.startsWith("https://"),
      responsivo: null, aparencia_moderna: null, velocidade_aproximada: null, botao_whatsapp: null,
      formulario_contato: null, informacoes_empresa: null, cta_claro: null, pagina_servicos: null,
      seo_basico: null, data_atualizacao_aparente: null, classificacao: "fraco", analisado_em: now, instagram_encontrado: null, whatsapp_encontrado: null,
    };
  }

  const { finalUrl, html, ms } = fetched;
  const lower = html.toLowerCase();

  const https = finalUrl.startsWith("https://");
  const responsivo = /<meta[^>]+name=["']viewport["']/i.test(html);
  const botaoWhatsapp = /(wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(html);
  const formularioContato = /<form[\s>]/i.test(html);
  const temTelefoneOuEmail = /(tel:|mailto:)/i.test(html);
  const temPalavrasContato = /(cnpj|endereço|nosso endereço|onde estamos|fale conosco)/i.test(lower);
  const informacoesEmpresa = formularioContato || temTelefoneOuEmail || temPalavrasContato;
  const ctaClaro = CTA_PHRASES.some((phrase) => lower.includes(phrase));
  const paginaServicos = /(servi[cç]os|produtos|about|sobre[- ]n[oó]s)/i.test(lower);

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{5,})["']/i);
  const seoBasico = Boolean(titleMatch?.[1]?.trim()) && Boolean(descMatch?.[1]?.trim());
  const aparenciaModerna = responsivo && (ctaClaro || formularioContato);
  const velocidade: SiteAnalysis["velocidade_aproximada"] = ms < 800 ? "rapida" : ms < 2500 ? "media" : "lenta";
  const yearMatch = html.match(/(?:©|copyright)\D{0,10}(\d{4})/i);
  const dataAtualizacaoAparente = yearMatch ? yearMatch[1] : null;
  const instagramEncontrado = extrairInstagramDoHtml(html);
  const whatsappEncontrado = extrairWhatsappDoHtml(html);

  const positives = [https, true, responsivo, aparenciaModerna, botaoWhatsapp, formularioContato, informacoesEmpresa, ctaClaro, paginaServicos, seoBasico].filter(Boolean).length;

  return {
    possui_site: true, site_confiavel: true, acessivel: true, https, responsivo,
    aparencia_moderna: aparenciaModerna, velocidade_aproximada: velocidade, botao_whatsapp: botaoWhatsapp,
    formulario_contato: formularioContato, informacoes_empresa: informacoesEmpresa, cta_claro: ctaClaro,
    pagina_servicos: paginaServicos, seo_basico: seoBasico, data_atualizacao_aparente: dataAtualizacaoAparente,
    classificacao: classify(true, positives), analisado_em: now, instagram_encontrado: instagramEncontrado, whatsapp_encontrado: whatsappEncontrado,
  };
}

export async function analyzeSite(website: string | null, sourceReliable: boolean): Promise<SiteAnalysis> {
  const now = new Date().toISOString();
  if (!website) return noSiteAnalysis(sourceReliable, now);
  return analyzeRealSite(website, now);
}

export const SITE_QUALITY_LABELS: Record<SiteQuality, string> = {
  excelente: "Excelente — site moderno e bem estruturado",
  bom: "Bom — site funcional, mas com oportunidades",
  fraco: "Fraco — site antigo ou pouco funcional",
  inexistente: "Inexistente — nenhum site encontrado",
};
