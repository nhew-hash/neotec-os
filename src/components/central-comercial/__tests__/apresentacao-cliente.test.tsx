import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ApresentacaoCliente } from "../apresentacao-cliente";

const dados = {
  nomeCliente: "Ana Souza",
  linhas: [{ tipo: "aparelho" as const, id: "a1", descricao: "iPhone 13 · 128 GB · Roxo · Seminovo", quantidade: 1, precoUnitario: 3500 }],
  proposta: {
    precoTabela: 3500, desconto: 100, tradeInValor: 800, baseLiquida: 2600, valorCheio: 2900, aVista: 2700,
    opcoes: [
      { parcelas: 1, valorParcela: 2700, valorTotal: 2700, comJuros: false },
      { parcelas: 3, valorParcela: 950, valorTotal: 2850, comJuros: true },
    ],
  },
};

describe("ApresentacaoCliente (tela mostrada ao cliente)", () => {
  const html = renderToStaticMarkup(createElement(ApresentacaoCliente, { dados, onFechar: () => {} }));
  it("com troca fala só a volta; não expõe valor da troca, desconto nem o Pix", () => {
    expect(html).toContain("iPhone 13 · 128 GB · Roxo · Seminovo");
    expect(html).toContain("Proposta para Ana");
    expect(html).toContain("A volta, com a troca do seu aparelho");
    expect(html).toMatch(/2\.900,00/);
    expect(html).toContain("3x");
    expect(html).not.toMatch(/800,00|Desconto|À vista|2\.700,00|3\.500,00/);
  });
  it("o Pix aparece só quando a vendedora libera", () => {
    const liberado = renderToStaticMarkup(createElement(ApresentacaoCliente, { dados: { ...dados, mostrarAVista: true }, onFechar: () => {} }));
    expect(liberado).toMatch(/À vista no Pix/);
    expect(liberado).toMatch(/2\.700,00/);
  });
  it("sem troca mostra 'Valor' cheio", () => {
    const semTroca = renderToStaticMarkup(createElement(ApresentacaoCliente, { dados: { ...dados, proposta: { ...dados.proposta, tradeInValor: 0, desconto: 0, valorCheio: 3500 } }, onFechar: () => {} }));
    expect(semTroca).toContain("Valor");
    expect(semTroca).not.toContain("A volta");
  });
  it("não existe nenhuma informação interna na tela", () => {
    expect(html).not.toMatch(/custo|margem|lucro|resultado|observa|limite|aprova/i);
  });
  it("não oferece parcela única como se fosse parcelamento", () => {
    expect(html).not.toContain("1x");
  });
});
