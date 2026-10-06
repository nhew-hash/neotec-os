import { describe, it, expect } from "vitest";
import { gerarSlug, slugUnico, slugValido } from "../slug";
import { validarLinkAfiliado, urlMidiaValida } from "../link";
import { ehTrafegoAutomatico } from "../bots";
import { escopoPermite, extrairBearer, gerarChaveApi, hashChave, normalizarEscopos } from "../chaves";
import {
  caminhoCompra, descontoExibido, imagensDaGaleria, interpretarVideo, limparParametro, precoAnteriorExibido,
} from "../apresentacao";

describe("slug", () => {
  it("gera slug sem acento, símbolo ou hífen sobrando", () => {
    expect(gerarSlug("Fone JBL Tune 510BT — Preto!")).toBe("fone-jbl-tune-510bt-preto");
    expect(gerarSlug("  Carregador 65W & Cabo  ")).toBe("carregador-65w-e-cabo");
    expect(gerarSlug("Pão de Açúcar")).toBe("pao-de-acucar");
    expect(gerarSlug("!!!")).toBe("produto");
  });
  it("limita o tamanho sem terminar em hífen", () => {
    const s = gerarSlug("a ".repeat(100));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
  it("valida formato e reservados", () => {
    expect(slugValido("fone-jbl")).toBe(true);
    for (const ruim of ["Fone", "fone--jbl", "-fone", "fone-", "fone jbl", "a", "ir", "sitemap", "novo", "fone/jbl"]) {
      expect(slugValido(ruim)).toBe(false);
    }
  });
  it("slugUnico evita colisão e nunca devolve slug reservado", async () => {
    const usados = new Set(["x", "x-2"]);
    expect(await slugUnico("x", async (s) => usados.has(s))).toBe("x-3");
    expect(await slugUnico("ir", async () => false)).toBe("ir-produto");
  });
});

describe("validarLinkAfiliado", () => {
  it("aceita Mercado Livre e devolve o link original sem mexer", () => {
    const link = "https://www.mercadolivre.com.br/produto/p/MLB1?matt_tool=123&ref=abc";
    expect(validarLinkAfiliado(link)).toEqual({ ok: true, url: link });
    expect(validarLinkAfiliado("  https://meli.la/abc  ")).toEqual({ ok: true, url: "https://meli.la/abc" });
  });
  it("rejeita open redirect e variações", () => {
    for (const ruim of [
      "https://evil.com", "https://mercadolivre.com.br.evil.com", "https://evilmercadolivre.com.br",
      "http://mercadolivre.com.br", "javascript:alert(1)", "data:text/html,x", "//mercadolivre.com.br",
      "https://mercadolivre.com.br@evil.com", "https://user:pw@mercadolivre.com.br", "", "não é url",
    ]) {
      expect(validarLinkAfiliado(ruim).ok).toBe(false);
    }
  });
  it("urlMidiaValida só aceita https", () => {
    expect(urlMidiaValida("https://http2.mlstatic.com/img.jpg")).toBe(true);
    expect(urlMidiaValida("http://x.com/a.jpg")).toBe(false);
    expect(urlMidiaValida("javascript:alert(1)")).toBe(false);
    expect(urlMidiaValida("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("chaves de API", () => {
  it("gera chave única com prefixo, e o hash é determinístico e não contém a chave", () => {
    const a = gerarChaveApi();
    const b = gerarChaveApi();
    expect(a.chave).toMatch(/^ach_[\w-]{43}$/);
    expect(a.chave).not.toBe(b.chave);
    expect(a.hash).toBe(hashChave(a.chave));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.chave.slice(4, 20));
    expect(a.chave.startsWith(a.prefixo)).toBe(true);
  });
  it("extrai o Bearer só quando bem formado e com o prefixo certo", () => {
    expect(extrairBearer("Bearer ach_abc123")).toBe("ach_abc123");
    expect(extrairBearer("bearer ach_abc123")).toBe("ach_abc123");
    for (const ruim of [null, undefined, "", "ach_abc", "Basic ach_abc", "Bearer", "Bearer abc123", "Bearer ach_a b"]) {
      expect(extrairBearer(ruim as string | null)).toBeNull();
    }
  });
  it("escopos", () => {
    expect(escopoPermite(["leitura"], "leitura")).toBe(true);
    expect(escopoPermite(["leitura", "escrita"], "status")).toBe(false);
    expect(normalizarEscopos(["excluir", "lixo", "leitura"])).toEqual(["leitura", "excluir"]);
  });
});

describe("tráfego automático", () => {
  it("ignora robôs e pré-visualização de link; conta navegador real", () => {
    for (const ua of [
      "Googlebot/2.1", "facebookexternalhit/1.1", "WhatsApp/2.23.20 A", "Mozilla/5.0 (compatible; bingbot/2.0)",
      "curl/8.0", "python-requests/2.31", "HeadlessChrome/120", "", undefined, null, "Slackbot-LinkExpanding",
    ]) {
      expect(ehTrafegoAutomatico(ua)).toBe(true);
    }
    expect(ehTrafegoAutomatico("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(ehTrafegoAutomatico("Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36")).toBe(false);
  });
});

describe("apresentação", () => {
  it("desconto exibido é só o informado — nunca calculado", () => {
    expect(descontoExibido({ desconto_percentual: 29.6 })).toBe(30);
    expect(descontoExibido({ desconto_percentual: null })).toBeNull();
    expect(descontoExibido({ desconto_percentual: 0 })).toBeNull();
  });
  it("preço riscado só quando o anterior é realmente maior", () => {
    expect(precoAnteriorExibido({ preco_atual: 70, preco_anterior: 100 })).toBe(100);
    expect(precoAnteriorExibido({ preco_atual: 100, preco_anterior: 100 })).toBeNull();
    expect(precoAnteriorExibido({ preco_atual: 100, preco_anterior: 80 })).toBeNull();
    expect(precoAnteriorExibido({ preco_atual: null, preco_anterior: 80 })).toBeNull();
  });
  it("interpreta vídeos", () => {
    expect(interpretarVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ tipo: "youtube", id: "dQw4w9WgXcQ" });
    expect(interpretarVideo("https://youtu.be/dQw4w9WgXcQ?t=3")).toEqual({ tipo: "youtube", id: "dQw4w9WgXcQ" });
    expect(interpretarVideo("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ tipo: "youtube", id: "dQw4w9WgXcQ" });
    expect(interpretarVideo("https://cdn.exemplo.com/v/demo.mp4")).toEqual({ tipo: "arquivo", url: "https://cdn.exemplo.com/v/demo.mp4" });
    expect(interpretarVideo("https://vimeo.com/123")).toEqual({ tipo: "link", url: "https://vimeo.com/123" });
    expect(interpretarVideo("https://www.youtube.com/watch?v=curto")).toBeNull();
    expect(interpretarVideo("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(interpretarVideo("")).toBeNull();
    expect(interpretarVideo(null)).toBeNull();
  });
  it("galeria: principal primeiro, sem repetir", () => {
    expect(imagensDaGaleria({ imagem_principal: "https://a/1.jpg", imagens: ["https://a/2.jpg", "https://a/1.jpg"] })).toEqual(["https://a/1.jpg", "https://a/2.jpg"]);
    expect(imagensDaGaleria({ imagem_principal: null, imagens: [] })).toEqual([]);
  });
  it("limpa parâmetros vindos da URL", () => {
    expect(limparParametro("  black\u0000friday\n ")).toBe("blackfriday");
    expect(limparParametro("x".repeat(500), 50)).toHaveLength(50);
    expect(limparParametro("   ")).toBeNull();
    expect(limparParametro(null)).toBeNull();
  });
  it("monta o caminho do botão de compra com UTMs escapadas", () => {
    const href = caminhoCompra("fone-jbl", "pdp", "/achadinhos/fone-jbl", { utm_source: "ig", utm_campaign: "a&b=c", utm_term: "ignorado" });
    const url = new URL(href, "https://x.com");
    expect(url.pathname).toBe("/achadinhos/ir/fone-jbl");
    expect(url.searchParams.get("o")).toBe("pdp");
    expect(url.searchParams.get("p")).toBe("/achadinhos/fone-jbl");
    expect(url.searchParams.get("utm_source")).toBe("ig");
    expect(url.searchParams.get("utm_campaign")).toBe("a&b=c");
    expect(url.searchParams.has("utm_term")).toBe(false);
  });
});
