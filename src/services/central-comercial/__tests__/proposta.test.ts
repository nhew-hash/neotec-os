import { describe, it, expect } from "vitest";
import { PricingEngine } from "@/services/precificacao/pricing-engine";
import { calcularProposta, textoDaProposta } from "../proposta";

// Taxas de TESTE (não são as da loja): Pix 1%, 1x 4%, 3x 6%, 12x 12%.
const taxas = [{ parcela: 0, taxaPercentual: 1 }, { parcela: 1, taxaPercentual: 4 }, { parcela: 3, taxaPercentual: 6 }, { parcela: 12, taxaPercentual: 12 }];

describe("calcularProposta — reutiliza o PricingEngine", () => {
  it("repassar_juros: à vista e parcelas batem exatamente com o motor", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "repassar_juros", descontoPixPercentual: 0 });
    const p = calcularProposta(engine, { precoTabela: 4000, desconto: 0, tradeInValor: 0 });
    const direto = engine.calcular(4000);
    expect(p.aVista).toBeCloseTo(direto.precoPix, 2);
    expect(p.opcoes.find((o) => o.parcelas === 12)!.valorTotal).toBeCloseTo(direto.parcelas.find((x) => x.numero === 12)!.valorTotal, 2);
    expect(p.opcoes.find((o) => o.parcelas === 12)!.valorParcela * 12).toBeCloseTo(p.opcoes.find((o) => o.parcelas === 12)!.valorTotal, 0);
  });

  it("desconto e trade-in reduzem a base ANTES do motor (nunca somam taxa sobre o abatimento)", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "repassar_juros", descontoPixPercentual: 0 });
    const p = calcularProposta(engine, { precoTabela: 4000, desconto: 200, tradeInValor: 1000 });
    expect(p.baseLiquida).toBe(2800);
    expect(p.aVista).toBeCloseTo(engine.calcular(2800).precoPix, 2);
  });

  it("embutir_juros: parcelas sem juros, total igual em todas", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "embutir_juros", descontoPixPercentual: 0 });
    const p = calcularProposta(engine, { precoTabela: 3000, desconto: 0, tradeInValor: 0 });
    expect(p.opcoes.every((o) => !o.comJuros)).toBe(true);
    expect(new Set(p.opcoes.map((o) => o.valorTotal)).size).toBe(1);
  });

  it("trade-in cobre tudo: nada a pagar, sem opções", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "repassar_juros", descontoPixPercentual: 0 });
    const p = calcularProposta(engine, { precoTabela: 1000, desconto: 0, tradeInValor: 1500 });
    expect(p.aVista).toBe(0);
    expect(p.opcoes).toEqual([]);
  });

  it("rejeita desconto maior que o preço e valores negativos", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "repassar_juros", descontoPixPercentual: 0 });
    expect(() => calcularProposta(engine, { precoTabela: 100, desconto: 101, tradeInValor: 0 })).toThrow();
    expect(() => calcularProposta(engine, { precoTabela: 100, desconto: -1, tradeInValor: 0 })).toThrow();
  });

  it("não vaza custo, margem nem recebimento líquido", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "repassar_juros", descontoPixPercentual: 0 });
    const json = JSON.stringify(calcularProposta(engine, { precoTabela: 4000, desconto: 0, tradeInValor: 0 }));
    for (const palavra of ["custo", "margem", "lucro", "recebimento", "taxa"]) expect(json.toLowerCase()).not.toContain(palavra);
  });

  it("texto do WhatsApp usa só valores calculados", () => {
    const engine = new PricingEngine(taxas, { modoJuros: "embutir_juros", descontoPixPercentual: 0 });
    const proposta = calcularProposta(engine, { precoTabela: 3000, desconto: 100, tradeInValor: 500 });
    const t = textoDaProposta({ descricao: "iPhone 15 128GB", proposta, nomeCliente: "Maria Souza" });
    expect(t).toContain("Maria");
    expect(t).toContain("iPhone 15 128GB");
    expect(t).toContain("Pix");
    expect(t).toMatch(/12x/);
  });
});
