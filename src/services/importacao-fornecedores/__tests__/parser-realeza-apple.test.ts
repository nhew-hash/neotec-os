import { describe, it, expect } from "vitest";
import { parseRealezaAppleLacrados } from "../parser-realeza-apple";
import {
  FIXTURE_2_REALEZA_APPLE_LACRADOS_V1,
  FIXTURE_3_REALEZA_APPLE_LACRADOS_V2,
} from "../__fixtures__/mensagens-reais";

describe("parser-realeza-apple — fixture 2 (Apple lacrados v1)", () => {
  const resultado = parseRealezaAppleLacrados(FIXTURE_2_REALEZA_APPLE_LACRADOS_V1);

  it("MacBook Neo 256/8GB → 2 itens (Roxo/Lilás e Azul) a 4697", () => {
    const macbooks = resultado.itens.filter((it) => /macbook/i.test(it.modeloCanonico));
    expect(macbooks).toHaveLength(2);
    expect(macbooks.every((m) => m.precoFornecedor === 4697)).toBe(true);
  });

  it("Apple Watch Series 11 46mm GPS Cinza-espacial 2250, 42mm GPS Prata 2190, SE 40mm GPS Preto 1650 (cor depois do preço)", () => {
    const watches = resultado.itens.filter((it) => /watch/i.test(it.modeloCanonico));
    expect(watches).toHaveLength(3);
    const s11_46 = watches.find((w) => w.precoFornecedor === 2250);
    expect(s11_46?.cor).toBe("Cinza-espacial");
    const s11_42 = watches.find((w) => w.precoFornecedor === 2190);
    expect(s11_42?.cor).toBe("Prata");
    const se = watches.find((w) => w.precoFornecedor === 1650);
    expect(se?.cor).toBe("Preto");
  });

  it("iPhone 14 128GB Branco 3499", () => {
    const item = resultado.itens.find((it) => /iphone 14$/i.test(it.modeloCanonico));
    expect(item).toBeTruthy();
    expect(item?.precoFornecedor).toBe(3499);
    expect(item?.corBase).toBe("Branco/Prata");
  });

  it("descarta os dois iPhone 15 Pro (CPO)", () => {
    const cpos = resultado.descartados.filter((d) => d.motivo === "cpo");
    expect(cpos).toHaveLength(2);
  });

  it("iPhone 15 128GB → Azul e Preto a 3899", () => {
    const items = resultado.itens.filter((it) => /iphone 15$/i.test(it.modeloCanonico));
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.precoFornecedor === 3899)).toBe(true);
  });

  it("iPhone 16 Plus 128GB Azul 4499", () => {
    const item = resultado.itens.find((it) => /iphone 16 plus/i.test(it.modeloCanonico));
    expect(item?.precoFornecedor).toBe(4499);
  });

  it("iPhone 17 256GB → Lavanda/Azul-névoa/Preto a 5270 + Sálvia a 5150 (4 itens, não ambíguo)", () => {
    const items = resultado.itens.filter((it) => /^iphone 17$/i.test(it.modeloCanonico));
    expect(items).toHaveLength(4);
    const a5270 = items.filter((i) => i.precoFornecedor === 5270);
    const a5150 = items.filter((i) => i.precoFornecedor === 5150);
    expect(a5270).toHaveLength(3);
    expect(a5150).toHaveLength(1);
  });

  it("iPhone 17 Pro 256GB → Laranja-cósmico 6799 + Prata 6899", () => {
    const items = resultado.itens.filter((it) => /^iphone 17 pro$/i.test(it.modeloCanonico));
    expect(items).toHaveLength(2);
    const laranja = items.find((i) => i.precoFornecedor === 6799);
    const prata = items.find((i) => i.precoFornecedor === 6899);
    expect(laranja?.cor).toBe("Laranja-cósmico");
    expect(prata?.cor).toBe("Prata");
  });

  it("iPhone 17 Pro Max 256GB → Prata/Laranja-cósmico/Azul-intenso a 7349", () => {
    const items = resultado.itens.filter((it) => /iphone 17 pro max/i.test(it.modeloCanonico));
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.precoFornecedor === 7349)).toBe(true);
  });

  it("iPhone 18 Pro Max 256GB → Azul e Preto a 11899", () => {
    const items = resultado.itens.filter((it) => /^iphone 18 pro max$/i.test(it.modeloCanonico) && it.precoFornecedor === 11899);
    expect(items).toHaveLength(2);
  });

  it("descarta iPhone 18 Pro Max 512GB por comentário ('pra quinta')", () => {
    const comentarios = resultado.descartados.filter((d) => d.motivo === "comentario");
    expect(comentarios.length).toBeGreaterThanOrEqual(1);
    expect(comentarios.some((c) => /512/.test(c.linhaOrigem))).toBe(true);
  });
});

describe("parser-realeza-apple — fixture 3 (reenvio no mesmo dia)", () => {
  const resultado = parseRealezaAppleLacrados(FIXTURE_3_REALEZA_APPLE_LACRADOS_V2);

  it("MacBook Neo agora a 4650 (preço atualizado)", () => {
    const macbooks = resultado.itens.filter((it) => /macbook/i.test(it.modeloCanonico));
    expect(macbooks).toHaveLength(2);
    expect(macbooks.every((m) => m.precoFornecedor === 4650)).toBe(true);
  });

  it("iPhone 17 256GB agora só tem Azul e Preto a 5270 (Lavanda saiu) + Sálvia a 5150", () => {
    const items = resultado.itens.filter((it) => /^iphone 17$/i.test(it.modeloCanonico));
    expect(items).toHaveLength(3);
    expect(items.some((i) => i.cor === "Lavanda")).toBe(false);
  });

  it("iPhone 18 Pro Max 512GB agora entra (sem comentário), Preto 12999", () => {
    const item = resultado.itens.find((it) => /iphone 18 pro max/i.test(it.modeloCanonico) && it.precoFornecedor === 12999);
    expect(item).toBeTruthy();
  });

  it("CPO continua descartado", () => {
    const cpos = resultado.descartados.filter((d) => d.motivo === "cpo");
    expect(cpos).toHaveLength(2);
  });
});
