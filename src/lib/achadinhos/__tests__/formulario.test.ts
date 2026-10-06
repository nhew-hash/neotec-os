import { describe, it, expect } from "vitest";
import { FORMULARIO_VAZIO, descontoSugerido, formularioParaEntrada } from "../formulario";

const base = { ...FORMULARIO_VAZIO, nome: " Fone Bluetooth ", link_afiliado: " https://meli.la/abc " };

describe("formularioParaEntrada", () => {
  it("cadastro rápido: só nome e link; o resto vira null/vazio", () => {
    const r = formularioParaEntrada(base, "criar");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entrada).toMatchObject({ nome: "Fone Bluetooth", link_afiliado: "https://meli.la/abc", preco_atual: null, imagens: [], tags: [], status: "rascunho" });
    expect(r.entrada).not.toHaveProperty("score");
  });
  it("preços em formato brasileiro e listas", () => {
    const r = formularioParaEntrada({ ...base, preco_atual: "R$ 1.890,00", preco_anterior: "2.100,50", tags: "Fone, bluetooth ,", imagens: "https://a.com/1.jpg\n\n https://a.com/2.jpg " }, "editar");
    if (!r.ok) throw new Error(r.erro);
    expect(r.entrada).toMatchObject({ preco_atual: 1890, preco_anterior: 2100.5, tags: ["Fone", "bluetooth"], imagens: ["https://a.com/1.jpg", "https://a.com/2.jpg"] });
    expect(r.entrada).not.toHaveProperty("status");
  });
  it("número inválido é recusado com o nome do campo", () => {
    const r = formularioParaEntrada({ ...base, preco_atual: "abc1x2" }, "criar");
    expect(r).toEqual({ ok: false, erro: "Preço atual: valor inválido" });
  });
  it("descarta linhas de informação vazias", () => {
    const r = formularioParaEntrada({ ...base, informacoes: [{ rotulo: "Cor", valor: "Preto" }, { rotulo: " ", valor: "" }] }, "criar");
    if (!r.ok) throw new Error(r.erro);
    expect(r.entrada.informacoes).toEqual([{ rotulo: "Cor", valor: "Preto" }]);
  });
});

describe("descontoSugerido", () => {
  it("calcula pelos preços e só quando o anterior é maior", () => {
    expect(descontoSugerido("80,00", "100,00")).toBe(20);
    expect(descontoSugerido("100,00", "100,00")).toBeNull();
    expect(descontoSugerido("120,00", "100,00")).toBeNull();
    expect(descontoSugerido("", "100,00")).toBeNull();
  });
});
