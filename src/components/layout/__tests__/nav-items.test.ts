import { describe, it, expect } from "vitest";
import { hrefAtivo, itensBarraInferior, itensDoCargo, navPrincipal, todosOsItens } from "../nav-items";

describe("hrefAtivo", () => {
  it("destaca só o item mais específico (antes, dois ficavam ativos)", () => {
    expect(hrefAtivo("/neo-performance/inteligencia")).toBe("/neo-performance");
    expect(hrefAtivo("/estoque/central-fornecedor")).toBe("/estoque/central-fornecedor");
    expect(hrefAtivo("/estoque/aparelhos/novo")).toBe("/estoque");
    expect(hrefAtivo("/configuracoes/equipe")).toBe("/configuracoes/equipe");
    expect(hrefAtivo("/loja-admin/analytics")).toBe("/loja-admin/analytics");
    expect(hrefAtivo("/loja-admin/cupons")).toBe("/loja-admin");
  });
  it("não confunde prefixos parecidos", () => {
    expect(hrefAtivo("/crm-qualquer")).toBeNull();
    expect(hrefAtivo("/comunicacao/abc")).toBe("/comunicacao");
  });
});

describe("estrutura da navegação", () => {
  it("os três pilares estão no grupo principal", () => {
    const hrefs = navPrincipal.map((i) => i.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/comunicacao", "/crm", "/central-comercial"]));
  });
  it("não há href duplicado", () => {
    const hrefs = todosOsItens().map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("módulos avaliados continuam acessíveis (não foram removidos)", () => {
    const hrefs = todosOsItens().map((i) => i.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/neo-performance", "/cotacoes", "/catalogo-fotos"]));
  });
  it("técnico não vê CRM/Comunicação, mas vê Assistência", () => {
    const hrefs = itensDoCargo("tecnico").map((i) => i.href);
    expect(hrefs).not.toContain("/crm");
    expect(hrefs).not.toContain("/comunicacao");
    expect(hrefs).toContain("/assistencia");
  });
});

describe("itensBarraInferior", () => {
  it("vendedor recebe os pilares", () => {
    expect(itensBarraInferior("vendedor").map((i) => i.href)).toEqual(["/dashboard", "/comunicacao", "/crm", "/central-comercial", "/clientes"]);
  });
  it("técnico recebe os destinos dele, no máximo 5", () => {
    const hrefs = itensBarraInferior("tecnico").map((i) => i.href);
    expect(hrefs).toEqual(["/dashboard", "/clientes", "/assistencia", "/estoque"]);
  });
});
