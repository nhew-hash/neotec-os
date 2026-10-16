import { describe, expect, it } from "vitest";
import { aceitaCategoria, extrairImei, inscricaoExpirada, lerPreferencias, normalizarImei, resumoMensagem, urlSegura } from "../push";

describe("preferências de notificação", () => {
  it("liga tudo por padrão e respeita o que foi desligado", () => {
    expect(lerPreferencias(null)).toEqual({ mensagens: true, retornos: true, aprovacoes: true });
    expect(lerPreferencias({ mensagens: false })).toEqual({ mensagens: false, retornos: true, aprovacoes: true });
  });
  it("pedido de captura sempre chega", () => {
    expect(aceitaCategoria({ mensagens: false, retornos: false, aprovacoes: false }, "capturas")).toBe(true);
    expect(aceitaCategoria({ mensagens: false }, "mensagens")).toBe(false);
  });
  it("desativa inscrição só em 404/410", () => {
    expect(inscricaoExpirada(410)).toBe(true);
    expect(inscricaoExpirada(404)).toBe(true);
    expect(inscricaoExpirada(500)).toBe(false);
    expect(inscricaoExpirada(undefined)).toBe(false);
  });
});

describe("url e texto da notificação", () => {
  it("só abre caminho interno", () => {
    expect(urlSegura("/comunicacao/1")).toBe("/comunicacao/1");
    expect(urlSegura("https://outro.site")).toBe("/comunicacao");
    expect(urlSegura("//outro.site")).toBe("/comunicacao");
  });
  it("resume mídia sem expor conteúdo e corta texto longo", () => {
    expect(resumoMensagem("imagem", "")).toBe("📷 Foto");
    expect(resumoMensagem("audio", null)).toBe("🎤 Áudio");
    expect(resumoMensagem("imagem", "olha a tela")).toBe("📷 Foto: olha a tela");
    expect(resumoMensagem("texto", "a".repeat(300)).length).toBe(140);
    expect(resumoMensagem("texto", "  oi \n tudo bem? ")).toBe("oi tudo bem?");
  });
});

describe("IMEI", () => {
  it("valida 15 dígitos com Luhn", () => {
    expect(normalizarImei("490154203237518")).toBe("490154203237518");
    expect(normalizarImei("49-015420-323751-8")).toBe("490154203237518");
    expect(normalizarImei("490154203237519")).toBeNull();
    expect(normalizarImei("12345")).toBeNull();
  });
  it("acha o IMEI dentro do texto do código de barras", () => {
    expect(extrairImei("IMEI:490154203237518")).toBe("490154203237518");
    expect(extrairImei("1490154203237518")).toBe("490154203237518");
    expect(extrairImei("SN F2LXK0ABCD")).toBeNull();
  });
});
