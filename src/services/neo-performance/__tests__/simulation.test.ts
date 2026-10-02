import { describe, it, expect } from "vitest";
import { aplicarPercentualAcao } from "../simulation.service";

describe("aplicarPercentualAcao (backtest/simulation mode, Seções 49-50)", () => {
  it("reduz o gasto no percentual informado", () => {
    expect(aplicarPercentualAcao(1000, "reduzir orçamento em 15%")).toBeCloseTo(850);
  });

  it("aumenta o gasto no percentual informado", () => {
    expect(aplicarPercentualAcao(1000, "aumentar orçamento em 20%")).toBeCloseTo(1200);
  });

  it("é case-insensitive pra reduzir/aumentar", () => {
    expect(aplicarPercentualAcao(1000, "REDUZIR em 10%")).toBeCloseTo(900);
  });

  it("devolve o gasto original quando a ação não descreve um percentual reconhecível", () => {
    expect(aplicarPercentualAcao(1000, "pausar campanha")).toBe(1000);
  });
});
