import { describe, it, expect } from "vitest";
import { detalhesDoAparelho, filtrarCatalogo, fotoPrincipalPorGrupo, grupoDaCategoria, lerParamItensProposta, paramItensProposta, textoDoItem, type ItemCatalogo } from "../catalogo";

const item = (o: Partial<ItemCatalogo>): ItemCatalogo => ({ tipo: "aparelho", id: "1", nome: "iPhone 13", grupo: "iphone_seminovo", detalhes: [], preco: 1000, foto: null, bateria: null, vaiParaProposta: true, linkLoja: null, quantidade: 1, ...o });
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

describe("catálogo de venda", () => {
  it("classifica iPhone novo como lacrado e o resto pela categoria", () => {
    expect(grupoDaCategoria("iphone", "novo")).toBe("lacrado");
    expect(grupoDaCategoria("iphone", "seminovo")).toBe("iphone_seminovo");
    expect(grupoDaCategoria("smartphone")).toBe("android");
    expect(grupoDaCategoria("apple_watch")).toBe("apple");
    expect(grupoDaCategoria("caixa_de_som")).toBe("audio");
    expect(grupoDaCategoria(null)).toBe("outros");
  });

  it("detalhes do aparelho omitem cor não informada", () => {
    expect(detalhesDoAparelho({ memoria: "128GB", cor: "Não informada", condicao: "seminovo", bateria: 87 })).toEqual(["128 GB", "Seminovo", "Bateria 87%"]);
  });

  it("filtra por todos os termos, grupo e preço, e ordena", () => {
    const lista = [item({ id: "a", nome: "iPhone 13", detalhes: ["128 GB", "Azul"], preco: 2000 }), item({ id: "b", nome: "iPhone 13", detalhes: ["256 GB"], preco: 2500 }), item({ id: "c", nome: "Carregador", grupo: "acessorio", preco: 100 })];
    expect(filtrarCatalogo(lista, { texto: "iphone 128gb" }).map((i) => i.id)).toEqual(["a"]);
    expect(filtrarCatalogo(lista, { grupo: "acessorio" }).map((i) => i.id)).toEqual(["c"]);
    expect(filtrarCatalogo(lista, { precoMax: 2100, ordem: "maior_preco" }).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("texto do WhatsApp usa só o preço cadastrado e o link da loja", () => {
    const t = textoDoItem([item({ nome: "iPhone 14", detalhes: ["128 GB"], preco: 2599, linkLoja: "/loja/produto/iphone-14" })], "https://x.com");
    expect(t).toContain("*iPhone 14* — 128 GB");
    expect(t).toMatch(/R\$\s2\.599,00/);
    expect(t).toContain("https://x.com/loja/produto/iphone-14");
    expect(t).not.toMatch(/\d+x de/);
  });

  it("parâmetro de itens: só aparelho/produto, ida e volta, ignora lixo", () => {
    const p = paramItensProposta([{ tipo: "aparelho", id: U1, vaiParaProposta: true }, { tipo: "lacrado", id: U2, vaiParaProposta: false }]);
    expect(p).toBe(`aparelho:${U1}`);
    expect(lerParamItensProposta(`${p},produto:${U2},lacrado:${U2},aparelho:xyz,${p}`)).toEqual([{ tipo: "aparelho", id: U1 }, { tipo: "produto", id: U2 }]);
  });
});

describe("fotoPrincipalPorGrupo", () => {
  it("ordem 0 primeiro, depois cenário, depois a menor ordem", () => {
    const m = fotoPrincipalPorGrupo([
      { grupo_id: "g1", url: "b", ordem: 2, tipo: "produto" }, { grupo_id: "g1", url: "c", ordem: 5, tipo: "cenario" }, { grupo_id: "g1", url: "a", ordem: 0, tipo: "produto" },
      { grupo_id: "g2", url: "x", ordem: 3, tipo: "produto" }, { grupo_id: "g2", url: "y", ordem: 4, tipo: "cenario" },
      { grupo_id: "g3", url: "p", ordem: 9, tipo: "produto" }, { grupo_id: "g3", url: "q", ordem: 1, tipo: "produto" },
    ]);
    expect([m.get("g1"), m.get("g2"), m.get("g3")]).toEqual(["a", "y", "q"]);
  });
});
