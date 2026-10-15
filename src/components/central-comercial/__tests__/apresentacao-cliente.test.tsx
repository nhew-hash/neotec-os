import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ApresentacaoCliente } from "../apresentacao-cliente";

const dados = {
  nomeCliente: "Ana Souza",
  linhas: [{ tipo: "aparelho" as const, id: "a1", descricao: "iPhone 13 · 128 GB · Roxo · Seminovo", quantidade: 1, precoUnitario: 3500 }],
  proposta: {
    precoTabela: 3500, desconto: 100, tradeInValor: 800, baseLiquida: 2600, aVista: 2700,
    opcoes: [
      { parcelas: 1, valorParcela: 2700, valorTotal: 2700, comJuros: false },
      { parcelas: 3, valorParcela: 950, valorTotal: 2850, comJuros: true },
    ],
  },
};

describe("ApresentacaoCliente (tela mostrada ao cliente)", () => {
  const html = renderToStaticMarkup(createElement(ApresentacaoCliente, { dados, onFechar: () => {} }));
  it("mostra item, valor à vista e parcelas calculadas", () => {
    expect(html).toContain("iPhone 13 · 128 GB · Roxo · Seminovo");
    expect(html).toContain("Proposta para Ana");
    expect(html).toMatch(/2\.700,00/);
    expect(html).toContain("3x");
  });
  it("não existe nenhuma informação interna na tela", () => {
    expect(html).not.toMatch(/custo|margem|lucro|resultado|observa|limite|aprova/i);
  });
  it("não oferece parcela única como se fosse parcelamento", () => {
    expect(html).not.toContain("1x");
  });
});
