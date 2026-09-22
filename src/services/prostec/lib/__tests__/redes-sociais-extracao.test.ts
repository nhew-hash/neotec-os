import { describe, it, expect } from "vitest";
import {
  extrairInstagramDoHtml, extrairWhatsappDoHtml, extrairFacebookDoHtml, extrairLinkedinDoHtml, extrairEmailsDoHtml,
} from "../site-analyzer";

describe("extrairInstagramDoHtml", () => {
  it("extrai handle de um link de perfil real", () => {
    expect(extrairInstagramDoHtml('<a href="https://instagram.com/padaria.joao">Instagram</a>')).toBe("https://instagram.com/padaria.joao");
  });

  it("ignora links de post/ação (não é o perfil)", () => {
    expect(extrairInstagramDoHtml('<a href="https://instagram.com/p/abc123">Post</a>')).toBeNull();
  });

  it("retorna null quando não há link de instagram", () => {
    expect(extrairInstagramDoHtml("<html><body>Sem redes sociais</body></html>")).toBeNull();
  });
});

describe("extrairWhatsappDoHtml", () => {
  it("extrai número de um link wa.me real", () => {
    expect(extrairWhatsappDoHtml('<a href="https://wa.me/5534999998888">WhatsApp</a>')).toBe("5534999998888");
  });

  it("retorna null sem link wa.me", () => {
    expect(extrairWhatsappDoHtml("<p>Ligue: (34) 99999-8888</p>")).toBeNull();
  });
});

describe("extrairFacebookDoHtml", () => {
  it("extrai handle de página real", () => {
    expect(extrairFacebookDoHtml('<a href="https://www.facebook.com/padariadojoao">FB</a>')).toBe("https://facebook.com/padariadojoao");
  });

  it("ignora handles genéricos (sharer, pages, etc.)", () => {
    expect(extrairFacebookDoHtml('<a href="https://facebook.com/sharer/sharer.php?u=x">Compartilhar</a>')).toBeNull();
  });
});

describe("extrairLinkedinDoHtml", () => {
  it("extrai página de empresa (/company/)", () => {
    expect(extrairLinkedinDoHtml('<a href="https://linkedin.com/company/neotec-solucoes">LinkedIn</a>')).toBe("https://linkedin.com/company/neotec-solucoes");
  });

  it("ignora handles genéricos", () => {
    expect(extrairLinkedinDoHtml('<a href="https://linkedin.com/company/about">x</a>')).toBeNull();
  });

  it("retorna null sem link de linkedin", () => {
    expect(extrairLinkedinDoHtml("<p>sem redes</p>")).toBeNull();
  });
});

describe("extrairEmailsDoHtml", () => {
  it("extrai e-mails de mailto: e soltos no texto, sem duplicar", () => {
    const html = '<a href="mailto:contato@padaria.com">Fale conosco</a><p>ou vendas@padaria.com</p><p>contato@padaria.com de novo</p>';
    expect(extrairEmailsDoHtml(html)).toEqual(["contato@padaria.com", "vendas@padaria.com"]);
  });

  it("descarta domínios de placeholder/serviço interno", () => {
    const html = "<p>oi@example.com e erro@sentry.io</p>";
    expect(extrairEmailsDoHtml(html)).toEqual([]);
  });

  it("descarta falsos positivos de nome de arquivo de imagem (ex: nome@2x.png)", () => {
    const html = '<img src="foto@2x.png">';
    expect(extrairEmailsDoHtml(html)).toEqual([]);
  });

  it("retorna vazio quando não há e-mail no html", () => {
    expect(extrairEmailsDoHtml("<p>Sem contato por aqui</p>")).toEqual([]);
  });
});
