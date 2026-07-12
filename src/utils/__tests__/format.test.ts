import { describe, it, expect } from "vitest";
import { formatCurrency, formatWhatsapp, getInitials } from "../format";

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

describe("getInitials", () => {
  it("pega a primeira letra do primeiro e do último nome", () => {
    expect(getInitials("João Silva")).toBe("JS");
  });

  it("lida com nome único", () => {
    expect(getInitials("Nhew")).toBe("N");
  });
});
