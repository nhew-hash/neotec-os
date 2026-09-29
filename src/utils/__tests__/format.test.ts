import { describe, it, expect } from "vitest";
import { formatCurrency, formatWhatsapp, getInitials, parseCurrencyBRL } from "../format";

describe("formatCurrency", () => {
  it("formata valores em Real brasileiro", () => {
    expect(formatCurrency(1500.5)).toBe("R$\u00A01.500,50");
  });

  it("formata zero corretamente", () => {
    expect(formatCurrency(0)).toBe("R$\u00A00,00");
  });
});

describe("formatWhatsapp", () => {
  it("formata um número de 11 dígitos com DDD", () => {
    expect(formatWhatsapp("34999998888")).toBe("(34) 99999-8888");
  });

  it("retorna o valor original se não tiver 11 dígitos", () => {
    expect(formatWhatsapp("123")).toBe("123");
  });
});

describe("parseCurrencyBRL", () => {
  it("interpreta formato completo com símbolo e milhar", () => {
    expect(parseCurrencyBRL("R$ 1.890,00")).toBe(1890);
  });

  it("interpreta formato sem símbolo, com milhar", () => {
    expect(parseCurrencyBRL("5.500,00")).toBe(5500);
  });

  it("interpreta formato só com vírgula decimal", () => {
    expect(parseCurrencyBRL("999,90")).toBe(999.9);
  });

  it("interpreta número já em formato com ponto decimal", () => {
    expect(parseCurrencyBRL("1890.5")).toBe(1890.5);
  });

  it("interpreta número inteiro sem separador", () => {
    expect(parseCurrencyBRL("1890")).toBe(1890);
  });

  it("retorna null pra campo vazio", () => {
    expect(parseCurrencyBRL("")).toBeNull();
    expect(parseCurrencyBRL("   ")).toBeNull();
  });

  it("retorna null pra texto sem número nenhum", () => {
    expect(parseCurrencyBRL("R$ abc")).toBeNull();
  });
});

describe("getInitials", () => {
  it("pega a primeira letra do primeiro e do último nome", () => {
    expect(getInitials("João Silva")).toBe("JS");
  });

  it("lida com nome único", () => {
    expect(getInitials("Nhew")).toBe("N");
  });
});
