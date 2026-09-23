import { describe, it, expect } from "vitest";
import { categoriaSlugParaCategoriaLoja } from "../aplicacao.service";
import { CATEGORIAS_LOJA, hrefCategoria } from "@/components/loja/categorias";

// Fase 245/246: menu final pedido pelo dono (24/09/2026) — 10 "lugares"
// na loja, consolidando o que a Fase 245 tinha espalhado em categorias
// demais. Samsung/Xiaomi/tablets Android NÃO entram aqui de propósito:
// esses vão pelo destino "lacrado" (condicao="Lacrado" no parser
// linha-única), não pelo produto genérico — cobertos pelo teste do
// parser, não deste mapeamento.
describe("categoriaSlugParaCategoriaLoja", () => {
  const valoresValidos = new Set(CATEGORIAS_LOJA.map((c) => c.valor));

  const casosComLugarProprio: Array<[string, string]> = [
    ["smartphones_iphone", "iphone"],
    ["smartwatches_apple_watch", "apple_watch"],
    ["tablets_ipad", "ipad"],
    ["computadores_macbook", "mac"],
    ["audio_fones", "audio"],
    ["audio_caixas_de_som", "audio"],
    ["audio_microfones", "audio"],
    ["perfumaria_perfumes_arabes", "perfume"],
    ["perfumaria_kits", "perfume"],
    ["casa_inteligente_robos_aspiradores", "eletronicos_mobilidade"],
    ["mobilidade_triciclos_patinetes", "eletronicos_mobilidade"],
    ["computadores_notebook", "eletronicos_mobilidade"],
  ];

  it.each(casosComLugarProprio)("%s -> %s", (slug, esperado) => {
    expect(categoriaSlugParaCategoriaLoja(slug)).toBe(esperado);
  });

  it("categoria_slug desconhecida (ou não roteada por aqui) cai no catch-all acessorio", () => {
    expect(categoriaSlugParaCategoriaLoja("nao-classificado")).toBe("acessorio");
    expect(categoriaSlugParaCategoriaLoja("acessorios_apple")).toBe("acessorio");
    expect(categoriaSlugParaCategoriaLoja("qualquer-coisa-nova-nao-mapeada")).toBe("acessorio");
  });

  it("todo valor retornado existe em CATEGORIAS_LOJA (nav/label não quebra)", () => {
    const todosOsSlugs = [...casosComLugarProprio.map(([slug]) => slug), "nao-classificado"];
    for (const slug of todosOsSlugs) {
      expect(valoresValidos.has(categoriaSlugParaCategoriaLoja(slug))).toBe(true);
    }
  });
});

describe("hrefCategoria", () => {
  it("categorias especiais (iPhone Lacrado, Android/Tablet) apontam pra página própria", () => {
    expect(hrefCategoria("iphone_lacrado")).toBe("/loja/lacrados");
    expect(hrefCategoria("android_tablet")).toBe("/loja/android");
  });

  it("categorias normais usam a página genérica /loja/categoria/[categoria]", () => {
    expect(hrefCategoria("iphone")).toBe("/loja/categoria/iphone");
    expect(hrefCategoria("audio")).toBe("/loja/categoria/audio");
    expect(hrefCategoria("eletronicos_mobilidade")).toBe("/loja/categoria/eletronicos_mobilidade");
  });

  it("o menu tem exatamente os 10 lugares pedidos, na ordem certa", () => {
    expect(CATEGORIAS_LOJA.map((c) => c.label)).toEqual([
      "iPhone Lacrado",
      "iPhone Seminovo",
      "Android / Tablet",
      "iPad",
      "Mac",
      "Apple Watch",
      "Áudio",
      "Perfumes",
      "Acessórios",
      "Eletrônicos e Mobilidade",
    ]);
  });
});
