import { describe, it, expect } from "vitest";
import { avaliarCondicao } from "../automation-engine.service";

// Escritos nesta sessão (sem node_modules disponível pra rodar `vitest`
// aqui) — cobrem a parte pura do Automation Engine (Seção 59: "Automation:
// regras, limites"). Rode `npx vitest run src/services/neo-performance`
// no seu ambiente pra confirmar.
describe("avaliarCondicao", () => {
  it("avalia maior que", () => {
    expect(avaliarCondicao(150, ">", 100)).toBe(true);
    expect(avaliarCondicao(50, ">", 100)).toBe(false);
  });

  it("avalia menor que", () => {
    expect(avaliarCondicao(2, "<", 5)).toBe(true);
    expect(avaliarCondicao(10, "<", 5)).toBe(false);
  });

  it("avalia maior-ou-igual e menor-ou-igual nas bordas", () => {
    expect(avaliarCondicao(100, ">=", 100)).toBe(true);
    expect(avaliarCondicao(100, "<=", 100)).toBe(true);
    expect(avaliarCondicao(99, ">=", 100)).toBe(false);
  });

  it("avalia igualdade exata", () => {
    expect(avaliarCondicao(5, "==", 5)).toBe(true);
    expect(avaliarCondicao(5, "==", 5.01)).toBe(false);
  });

  it("exemplo da Seção 22 do prompt mestre: CAC > 150 E gasto > 300 E vendas < 2", () => {
    const cac = 180, gasto = 350, vendas = 1;
    const condicoesAtendidas = avaliarCondicao(cac, ">", 150) && avaliarCondicao(gasto, ">", 300) && avaliarCondicao(vendas, "<", 2);
    expect(condicoesAtendidas).toBe(true);
  });
});
