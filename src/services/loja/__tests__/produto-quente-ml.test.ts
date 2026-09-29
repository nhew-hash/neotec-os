import { describe, it, expect } from "vitest";
import { extrairMeta, extrairJsonLdProduct } from "../produto-quente-ml.service";

describe("extrairMeta", () => {
  it("extrai og:title de uma meta tag real", () => {
    const html = '<html><head><meta property="og:title" content="iPhone 13 128GB Azul"></head></html>';
    expect(extrairMeta(html, "og:title")).toBe("iPhone 13 128GB Azul");
  });

  it("retorna null quando a meta tag não existe", () => {
    expect(extrairMeta("<html><head></head></html>", "og:title")).toBeNull();
  });

  it("aceita atributo name além de property", () => {
    const html = '<meta name="product:price:amount" content="299.90">';
    expect(extrairMeta(html, "product:price:amount")).toBe("299.90");
  });
});

describe("extrairJsonLdProduct", () => {
  it("extrai um bloco JSON-LD do tipo Product", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product", name: "Robô Aspirador X200", description: "Aspira e passa pano",
      offers: { price: 1299.9 },
    })}</script>`;
    const produto = extrairJsonLdProduct(html);
    expect(produto?.name).toBe("Robô Aspirador X200");
  });

  it("ignora blocos JSON-LD que não são Product (ex: BreadcrumbList)", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "BreadcrumbList", itemListElement: [] })}</script>`;
    expect(extrairJsonLdProduct(html)).toBeNull();
  });

  it("retorna null com HTML sem nenhum JSON-LD", () => {
    expect(extrairJsonLdProduct("<html><body>Sem dado estruturado</body></html>")).toBeNull();
  });

  it("nunca lança exceção com JSON-LD malformado — degrada com elegância", () => {
    const html = '<script type="application/ld+json">{ isso não é json válido </script>';
    expect(() => extrairJsonLdProduct(html)).not.toThrow();
    expect(extrairJsonLdProduct(html)).toBeNull();
  });

  it("acha o Product quando o JSON-LD é um array de blocos", () => {
    const html = `<script type="application/ld+json">${JSON.stringify([
      { "@type": "BreadcrumbList" },
      { "@type": "Product", name: "Triciclo Drift" },
    ])}</script>`;
    expect(extrairJsonLdProduct(html)?.name).toBe("Triciclo Drift");
  });
});
