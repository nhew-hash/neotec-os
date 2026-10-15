import { describe, it, expect } from "vitest";
import { selecionarDestaques } from "../selecionar-destaques";
import type { ProdutoLoja } from "@/types";

const p = (id: string, categoria: string, extra: Partial<ProdutoLoja> = {}) =>
  ({ id, categoria, nome: id, preco_venda: 100, fotos: ["x.jpg"], ...extra }) as ProdutoLoja;

describe("selecionarDestaques", () => {
  it("alterna categorias com iPhone primeiro, sem deixar perfume dominar", () => {
    const lista = [p("perf1", "perfume"), p("perf2", "perfume"), p("perf3", "perfume"), p("ip1", "iphone"), p("ip2", "iphone"), p("w1", "apple_watch")];
    expect(selecionarDestaques(lista, 4).map((x) => x.id)).toEqual(["ip1", "w1", "perf1", "ip2"]);
  });
  it("ignora produto sem foto ou sem preço", () => {
    const lista = [p("semfoto", "iphone", { fotos: [] }), p("sempreco", "iphone", { preco_venda: null }), p("ok", "iphone")];
    expect(selecionarDestaques(lista, 8).map((x) => x.id)).toEqual(["ok"]);
  });
});
