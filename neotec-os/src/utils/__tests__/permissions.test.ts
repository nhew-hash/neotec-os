import { describe, it, expect } from "vitest";
import { podeVerCusto, podeVerFinanceiro, podeGerenciarUsuarios } from "../permissions";

describe("podeVerCusto", () => {
  it("admin e gerente veem custo", () => {
    expect(podeVerCusto("admin")).toBe(true);
    expect(podeVerCusto("gerente")).toBe(true);
  });

  it("vendedor, técnico e caixa não veem custo", () => {
    expect(podeVerCusto("vendedor")).toBe(false);
    expect(podeVerCusto("tecnico")).toBe(false);
    expect(podeVerCusto("caixa")).toBe(false);
  });
});

describe("podeVerFinanceiro", () => {
  it("admin, gerente e caixa acessam financeiro", () => {
    expect(podeVerFinanceiro("admin")).toBe(true);
    expect(podeVerFinanceiro("gerente")).toBe(true);
    expect(podeVerFinanceiro("caixa")).toBe(true);
  });

  it("vendedor e técnico não acessam financeiro", () => {
    expect(podeVerFinanceiro("vendedor")).toBe(false);
    expect(podeVerFinanceiro("tecnico")).toBe(false);
  });
});

describe("podeGerenciarUsuarios", () => {
  it("apenas admin gerencia usuários", () => {
    expect(podeGerenciarUsuarios("admin")).toBe(true);
    expect(podeGerenciarUsuarios("gerente")).toBe(false);
  });
});
