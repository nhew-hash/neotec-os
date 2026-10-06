import { describe, it, expect } from "vitest";
import {
  decidirDestino, montarRegistroClique, normalizarOrigemClique, normalizarPagina, type ProdutoParaClique,
} from "../achadinhos.clique.service";

const produto = (extra: Partial<ProdutoParaClique> = {}): ProdutoParaClique => ({
  id: "p1", slug: "fone-jbl", loja_id: "loja1", link_afiliado: "https://meli.la/abc",
  origem: "mercado_livre", status: "ativo", excluido_em: null, ...extra,
});

describe("decidirDestino", () => {
  it("produto ativo com link válido → vai pro afiliado", () => {
    expect(decidirDestino(produto())).toEqual({ tipo: "afiliado", url: "https://meli.la/abc" });
  });
  it.each([
    ["inexistente", null],
    ["pausado", produto({ status: "pausado" })],
    ["arquivado", produto({ status: "arquivado" })],
    ["rascunho", produto({ status: "rascunho" })],
    ["excluído", produto({ excluido_em: "2026-10-01T00:00:00Z" })],
    ["link fora do domínio", produto({ link_afiliado: "https://golpe.com/x" })],
    ["link http", produto({ link_afiliado: "http://meli.la/abc" })],
  ])("%s → volta pro catálogo (nunca segue um destino não confiável)", (_m, p) => {
    expect(decidirDestino(p)).toEqual({ tipo: "catalogo" });
  });
});

describe("montarRegistroClique", () => {
  it("monta o affiliate_click com os campos do briefing e nada de dado pessoal", () => {
    const r = montarRegistroClique(produto(), {
      p: "/achadinhos/fone-jbl?utm_source=ig&email=a@b.com#x", o: "pdp",
      utm_source: "instagram", utm_medium: "story", utm_campaign: "black-friday", utm_content: "video1",
    });
    expect(r).toEqual({
      loja_id: "loja1", produto_id: "p1", produto_slug: "fone-jbl",
      pagina: "/achadinhos/fone-jbl", origem: "pdp",
      utm_source: "instagram", utm_medium: "story", utm_campaign: "black-friday", utm_content: "video1",
    });
    const campos = Object.keys(r);
    for (const proibido of ["ip", "user_agent", "ua", "cookie", "email", "telefone"]) expect(campos).not.toContain(proibido);
  });
  it("parâmetros ausentes viram null", () => {
    const r = montarRegistroClique(produto(), {});
    expect(r).toMatchObject({ pagina: null, origem: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null });
  });
  it("sanitiza e limita as UTMs", () => {
    const r = montarRegistroClique(produto(), { utm_campaign: "a\u0000b\n" + "x".repeat(500) });
    expect(r.utm_campaign).toHaveLength(120);
    expect(r.utm_campaign).not.toMatch(/[\u0000-\u001f]/);
  });
});

describe("normalizarPagina / normalizarOrigemClique", () => {
  it("só aceita caminho interno", () => {
    expect(normalizarPagina("/achadinhos")).toBe("/achadinhos");
    expect(normalizarPagina("/achadinhos/x?a=1#b")).toBe("/achadinhos/x");
    for (const ruim of ["https://evil.com/x", "//evil.com", "achadinhos", "", null, undefined, "javascript:alert(1)"]) {
      expect(normalizarPagina(ruim)).toBeNull();
    }
  });
  it("origem do clique: lista conhecida, resto vira 'outro'", () => {
    expect(normalizarOrigemClique("pdp")).toBe("pdp");
    expect(normalizarOrigemClique("pdp_fixo")).toBe("pdp_fixo");
    expect(normalizarOrigemClique("qualquer-coisa")).toBe("outro");
    expect(normalizarOrigemClique("")).toBeNull();
    expect(normalizarOrigemClique(null)).toBeNull();
  });
});
