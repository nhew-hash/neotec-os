import { describe, it, expect } from "vitest";
import { corresponde, finalDoImei, formatarCapacidade, paginar, rotuloAparelho, termosDaBusca } from "../itens-busca";

describe("rotuloAparelho", () => {
  it("monta nome completo legível", () => {
    expect(rotuloAparelho({ nome: "iPhone 13", memoria: "128GB", cor: "Roxo", condicao: "seminovo" })).toBe("iPhone 13 · 128 GB · Roxo · Seminovo");
  });
  it("pula o que não existe, sem deixar separador sobrando", () => {
    expect(rotuloAparelho({ nome: "iPhone 11", memoria: null, cor: null, condicao: "novo" })).toBe("iPhone 11 · Novo");
    expect(rotuloAparelho({})).toBe("Aparelho");
  });
});

describe("formatarCapacidade", () => {
  it("separa número e unidade", () => {
    expect(formatarCapacidade("256gb")).toBe("256 GB");
    expect(formatarCapacidade("1 TB")).toBe("1 TB");
    expect(formatarCapacidade(null)).toBeNull();
  });
});

describe("corresponde", () => {
  const textos = ["iPhone 13 · 128 GB · Roxo · Seminovo", "Apple"];
  it("exige todos os termos", () => {
    expect(corresponde(textos, termosDaBusca("iphone 13 roxo"))).toBe(true);
    expect(corresponde(textos, termosDaBusca("iphone 14 roxo"))).toBe(false);
  });
  it("ignora acento e maiúscula, e casa 128gb com 128 GB", () => {
    expect(corresponde(["iPhone 13 · 128 GB · Azul-céu"], termosDaBusca("AZUL CEU 128gb"))).toBe(true);
  });
  it("sem termos, tudo corresponde", () => {
    expect(corresponde(textos, [])).toBe(true);
  });
});

describe("finalDoImei / paginar", () => {
  it("mostra só os 4 últimos dígitos", () => {
    expect(finalDoImei("356938035643809")).toBe("IMEI …3809");
    expect(finalDoImei("12")).toBeNull();
  });
  it("indica quando há mais resultados", () => {
    const lista = Array.from({ length: 25 }, (_, i) => i);
    expect(paginar(lista, 0, 10)).toEqual({ pagina: lista.slice(0, 10), temMais: true });
    expect(paginar(lista, 2, 10)).toEqual({ pagina: lista.slice(20), temMais: false });
  });
});
