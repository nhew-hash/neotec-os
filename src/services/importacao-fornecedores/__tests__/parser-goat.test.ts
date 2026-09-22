import { describe, it, expect } from "vitest";
import { parseGoat } from "../parser-goat";
import { FIXTURE_1_GOAT_COMPLETA } from "../__fixtures__/mensagens-reais";

describe("parser-goat — fixture 1 (lista completa real)", () => {
  const resultado = parseGoat(FIXTURE_1_GOAT_COMPLETA);

  it("descarta os dois iPhone 17 Pro Max lacrados (regra: lacrado só da Realeza)", () => {
    const descartesLacrado = resultado.descartados.filter((d) => d.motivo === "iphone_lacrado_goat");
    expect(descartesLacrado).toHaveLength(2);
    expect(descartesLacrado.map((d) => d.descricao).join(" | ")).toMatch(/Prata|Silver/i);
    expect(descartesLacrado.map((d) => d.descricao).join(" | ")).toMatch(/Laranja/i);
  });

  it("descarta os 4 seminovos com bateria abaixo de 80%", () => {
    const descartesBateria = resultado.descartados.filter((d) => d.motivo === "bateria_baixa");
    expect(descartesBateria).toHaveLength(4);
    const detalhes = descartesBateria.map((d) => d.detalhe);
    expect(detalhes).toEqual(expect.arrayContaining(["72%", "77%", "79%", "77%"]));
  });

  it("usa a cor ESCRITA (não o emoji) — 🟡 vira Laranja num item e Dourado noutro", () => {
    const laranja = resultado.itens.find((it) => it.cor === "Laranja");
    const dourado = resultado.itens.find((it) => it.cor === "Dourado");
    // Laranja foi descartado (era o lacrado da Goat) então checamos no descarte
    const descarteLaranja = resultado.descartados.find((d) => /Laranja/i.test(d.descricao));
    expect(descarteLaranja).toBeTruthy();
    expect(dourado).toBeTruthy();
    expect(dourado?.precoFornecedor).toBe(3000);
  });

  it("normaliza UDII para UDI", () => {
    const item = resultado.itens.find((it) => it.bateriaPct === 88);
    expect(item?.cidade).toBe("UDI");
  });

  it("aceita o iPad 11 128GB Prata/Silver e o Apple Pencil Branco", () => {
    const ipad = resultado.itens.find((it) => /ipad/i.test(it.modeloCanonico));
    expect(ipad).toBeTruthy();
    expect(ipad?.precoFornecedor).toBe(2950);
    expect(ipad?.cidade).toBe("UDI");

    const pencil = resultado.itens.find((it) => /pencil/i.test(it.modeloCanonico));
    expect(pencil).toBeTruthy();
    expect(pencil?.precoFornecedor).toBe(850);
  });

  it("aceita os 3 Apple Watch: S11 46mm Preto e 42mm Prata (Lacrado), S10 e S9 (Seminovo)", () => {
    const watches = resultado.itens.filter((it) => /watch/i.test(it.modeloCanonico));
    // S11 46mm Preto, S11 42mm Prata, S10 Preto 100%, S10 Rosa 100%, S9 46mm Prata 89% = 5 itens
    expect(watches.length).toBe(5);

    const s11Lacrados = watches.filter((w) => w.condicao === "Lacrado");
    expect(s11Lacrados).toHaveLength(2);

    const seminovos = watches.filter((w) => w.condicao === "Seminovo");
    expect(seminovos).toHaveLength(3);
    expect(seminovos.every((w) => (w.bateriaPct ?? 0) >= 80)).toBe(true);
  });

  it("cada linha de mesmo modelo+cor com bateria/cidade diferente vira item separado", () => {
    // IPHONE 13 128gb tem duas linhas ⚫️PRETO a R$2.000,00 (83% ARI e 84% ARI) — itens distintos
    const pretos2000 = resultado.itens.filter(
      (it) => /iphone 13$/i.test(it.modeloCanonico) && it.cor === "Preto" && it.precoFornecedor === 2000
    );
    expect(pretos2000.length).toBe(2);
    const baterias = pretos2000.map((i) => i.bateriaPct).sort();
    expect(baterias).toEqual([83, 84]);
  });

  it("ignora aviso, separadores e link", () => {
    const semLixo = resultado.itens.every((it) => !/reservamos|link da nossa comunidade|chat\.whatsapp/i.test(it.linhaOrigem));
    expect(semLixo).toBe(true);
  });
});
