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

import { escolherParcelasParaMensagem, mensagemComercial, parcelamentoDisponivel, totalDasLinhas } from "../proposta";

describe("proposta com vários itens e mensagem", () => {
  const opcoes = [1, 2, 3, 6, 10, 12].map((n) => ({ parcelas: n, valorParcela: 100, valorTotal: 100 * n, comJuros: n > 3 }));
  const base = { precoTabela: 5000, desconto: 0, tradeInValor: 0, baseLiquida: 5000, aVista: 4800, opcoes };

  it("soma as linhas com quantidade", () => {
    expect(totalDasLinhas([{ descricao: "a", quantidade: 1, precoUnitario: 4000 }, { descricao: "b", quantidade: 2, precoUnitario: 49.9 }])).toBe(4099.8);
  });
  it("escolhe a maior parcela sem juros e as de 6/10/12 que existem", () => {
    expect(escolherParcelasParaMensagem(opcoes).map((o) => o.parcelas)).toEqual([3, 6, 10, 12]);
    expect(escolherParcelasParaMensagem(opcoes.filter((o) => o.parcelas <= 3)).map((o) => o.parcelas)).toEqual([3]);
    expect(escolherParcelasParaMensagem([])).toEqual([]);
  });
  it("parcelamento não configurado é detectado, e proposta zerada não acusa falha", () => {
    expect(parcelamentoDisponivel({ ...base, opcoes: [{ parcelas: 1, valorParcela: 4800, valorTotal: 4800, comJuros: false }] })).toBe(false);
    expect(parcelamentoDisponivel(base)).toBe(true);
    expect(parcelamentoDisponivel({ ...base, baseLiquida: 0, aVista: 0, opcoes: [] })).toBe(true);
  });
  it("mensagem de WhatsApp usa só valores calculados, sem prometer reserva", () => {
    const m = mensagemComercial({ linhas: [{ descricao: "iPhone 13 · 128 GB · Roxo · Seminovo", quantidade: 1, precoUnitario: 5000 }], proposta: base, nomeCliente: "Ana Souza", vendedor: "Bia Lima", modo: "whatsapp" });
    expect(m).toContain("Olá, Ana!");
    expect(m).toContain("iPhone 13 · 128 GB · Roxo · Seminovo");
    expect(m).toContain("À vista (Pix)");
    expect(m).toContain("3x de");
    expect(m).toContain("3x de R$") ;
    expect(m).not.toMatch(/reserv|garantia/i);
    expect(m).toContain("confirmados no fechamento");
    expect(m).toContain("— Bia, Neotec");
  });
  it("presencial não começa com saudação de conversa e mostra desconto/troca quando há", () => {
    const m = mensagemComercial({ linhas: [{ descricao: "Capa", quantidade: 2, precoUnitario: 50 }], proposta: { ...base, desconto: 100, tradeInValor: 800 }, modo: "presencial" });
    expect(m.startsWith("Proposta Neotec")).toBe(true);
    expect(m).toContain("2x Capa");
    expect(m).toContain("Desconto: -");
    expect(m).toContain("na troca: -");
  });
  it("sem parcelas do motor, não inventa parcelamento", () => {
    const m = mensagemComercial({ linhas: [{ descricao: "X", quantidade: 1, precoUnitario: 5000 }], proposta: { ...base, opcoes: [] }, modo: "whatsapp" });
    expect(m).not.toContain("💳");
  });
});
