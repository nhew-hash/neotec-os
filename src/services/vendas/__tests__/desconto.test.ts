import { describe, it, expect } from "vitest";
import { avaliarDesconto, calcularPercentualDesconto, interpretarErroVenda } from "../desconto";

const regraAtiva = { regraAtiva: true, limitesPorCargo: { vendedor: 5, gerente: 12 } };

describe("calcularPercentualDesconto", () => {
  it("calcula e arredonda em 2 casas", () => {
    expect(calcularPercentualDesconto(1000, 50)).toBe(5);
    expect(calcularPercentualDesconto(3000, 100)).toBe(3.33);
  });
  it("trata zero e negativos", () => {
    expect(calcularPercentualDesconto(0, 10)).toBe(0);
    expect(calcularPercentualDesconto(1000, 0)).toBe(0);
    expect(calcularPercentualDesconto(1000, -5)).toBe(0);
  });
});

describe("avaliarDesconto", () => {
  it("regra desligada: tudo livre (comportamento atual preservado)", () => {
    expect(avaliarDesconto({ cargo: "vendedor", valorBruto: 1000, desconto: 900, regra: { regraAtiva: false, limitesPorCargo: {} } })).toEqual({ situacao: "livre" });
  });
  it("admin nunca exige aprovação", () => {
    expect(avaliarDesconto({ cargo: "admin", valorBruto: 1000, desconto: 500, regra: regraAtiva })).toEqual({ situacao: "livre" });
  });
  it("dentro e fora do limite do cargo", () => {
    expect(avaliarDesconto({ cargo: "vendedor", valorBruto: 1000, desconto: 50, regra: regraAtiva })).toEqual({ situacao: "dentro_do_limite", limite: 5 });
    expect(avaliarDesconto({ cargo: "vendedor", valorBruto: 1000, desconto: 51, regra: regraAtiva })).toEqual({ situacao: "requer_aprovacao", limite: 5, percentual: 5.1 });
  });
  it("cargo sem regra definida = 0%: qualquer desconto exige aprovação", () => {
    expect(avaliarDesconto({ cargo: "caixa", valorBruto: 1000, desconto: 1, regra: regraAtiva }).situacao).toBe("requer_aprovacao");
  });
  it("sem desconto não exige nada", () => {
    expect(avaliarDesconto({ cargo: "caixa", valorBruto: 1000, desconto: 0, regra: regraAtiva })).toEqual({ situacao: "livre" });
  });
  it("desconto maior que o bruto ou negativo é inválido mesmo com a regra desligada", () => {
    expect(avaliarDesconto({ cargo: "admin", valorBruto: 100, desconto: 101, regra: { regraAtiva: false, limitesPorCargo: {} } }).situacao).toBe("invalido");
    expect(avaliarDesconto({ cargo: "admin", valorBruto: 100, desconto: -1, regra: regraAtiva }).situacao).toBe("invalido");
  });
});

describe("interpretarErroVenda", () => {
  it("extrai código e texto da exceção do banco", () => {
    expect(interpretarErroVenda("APARELHO_INDISPONIVEL: aparelho já vendido ou indisponível (abc)")).toEqual({
      codigo: "APARELHO_INDISPONIVEL", texto: "aparelho já vendido ou indisponível (abc)",
    });
  });
  it("mensagem desconhecida volta sem código", () => {
    expect(interpretarErroVenda("duplicate key value")).toEqual({ codigo: null, texto: "duplicate key value" });
  });
});
