import { describe, it, expect } from "vitest";
import { normalizarTelefoneE164BR, normalizarSite, normalizarEmails, normalizarTexto } from "../normalizacao";

describe("normalizarTelefoneE164BR", () => {
  it("normaliza celular com DDI, DDD e 9º dígito", () => {
    expect(normalizarTelefoneE164BR("+55 34 99999-8888")).toBe("+5534999998888");
  });

  it("normaliza celular sem DDI", () => {
    expect(normalizarTelefoneE164BR("(34) 99999-8888")).toBe("+5534999998888");
  });

  it("normaliza fixo (10 dígitos, sem 9º dígito)", () => {
    expect(normalizarTelefoneE164BR("(34) 3222-1234")).toBe("+553432221234");
  });

  it("rejeita celular sem o 9 na frente do número", () => {
    expect(normalizarTelefoneE164BR("34 12345-8888")).toBeNull();
  });

  it("rejeita DDD inexistente", () => {
    expect(normalizarTelefoneE164BR("00 99999-8888")).toBeNull();
  });

  it("rejeita quantidade de dígitos inválida", () => {
    expect(normalizarTelefoneE164BR("123")).toBeNull();
  });

  it("retorna null para telefone vazio/nulo", () => {
    expect(normalizarTelefoneE164BR(null)).toBeNull();
    expect(normalizarTelefoneE164BR("")).toBeNull();
  });
});

describe("normalizarSite", () => {
  it("adiciona https:// quando falta protocolo", () => {
    expect(normalizarSite("www.empresa.com.br")).toBe("https://www.empresa.com.br");
  });

  it("força https mesmo se veio http", () => {
    expect(normalizarSite("http://empresa.com.br")).toBe("https://empresa.com.br");
  });

  it("remove parâmetros de rastreio (utm_*, fbclid, gclid)", () => {
    expect(normalizarSite("https://empresa.com.br/?utm_source=google&fbclid=abc&ref=ok")).toBe("https://empresa.com.br/?ref=ok");
  });

  it("remove barra final quando é só a raiz do domínio", () => {
    expect(normalizarSite("https://empresa.com.br")).toBe("https://empresa.com.br");
  });

  it("retorna null para site vazio/nulo", () => {
    expect(normalizarSite(null)).toBeNull();
    expect(normalizarSite("")).toBeNull();
  });

  it("retorna null para URL inválida", () => {
    expect(normalizarSite("https://")).toBeNull();
  });
});

describe("normalizarEmails", () => {
  it("filtra formato inválido e minúsculiza", () => {
    expect(normalizarEmails(["Contato@Empresa.com.br", "nao-eh-email"])).toEqual(["contato@empresa.com.br"]);
  });

  it("remove duplicados", () => {
    expect(normalizarEmails(["a@empresa.com", "a@empresa.com"])).toEqual(["a@empresa.com"]);
  });

  it("descarta domínios de placeholder/serviço interno", () => {
    expect(normalizarEmails(["oi@example.com", "teste@sentry.io", "contato@wixpress.com"])).toEqual([]);
  });

  it("retorna vazio pra lista vazia", () => {
    expect(normalizarEmails([])).toEqual([]);
  });
});

describe("normalizarTexto", () => {
  it("colapsa espaços múltiplos e tira as pontas", () => {
    expect(normalizarTexto("  Empresa   Teste  ")).toBe("Empresa Teste");
  });

  it("retorna null pra texto vazio ou só espaço", () => {
    expect(normalizarTexto("")).toBeNull();
    expect(normalizarTexto("   ")).toBeNull();
    expect(normalizarTexto(null)).toBeNull();
  });
});
