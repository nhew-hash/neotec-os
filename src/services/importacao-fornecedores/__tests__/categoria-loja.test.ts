import { describe, it, expect } from "vitest";
import { categoriaSlugParaCategoriaLoja } from "../aplicacao.service";
import { CATEGORIAS_LOJA } from "@/components/loja/categorias";

// Fase 245: bug reportado pelo dono (24/09/2026) — Perfumes e JBL (e, por
// extensão, toda categoria nova das Fases 243/244) caíam no catch-all
// "acessorio" porque a loja pública só tinha 5 "lugares" (iphone/
// apple_watch/ipad/mac/acessorio) e o mapeamento nunca foi atualizado.
// Este teste garante que toda categoria_slug relevante tem um "lugar"
// PRÓPRIO na loja (não cai em acessorio à toa) e que o valor retornado
// sempre existe em CATEGORIAS_LOJA (senão a navegação/label quebra).
describe("categoriaSlugParaCategoriaLoja", () => {
  const valoresValidos = new Set(CATEGORIAS_LOJA.map((c) => c.valor));

  const casosComLugarProprio: Array<[string, string]> = [
    ["smartphones_iphone", "iphone"],
    ["smartphones_samsung", "smartphone"],
    ["smartphones_xiaomi", "smartphone"],
    ["smartphones_outras_marcas", "smartphone"],
    ["smartwatches_apple_watch", "apple_watch"],
    ["tablets_ipad", "ipad"],
    ["tablets_android", "tablet"],
    ["tablets_infantil", "tablet"],
    ["computadores_macbook", "mac"],
    ["computadores_notebook", "notebook"],
    ["audio_fones", "fone"],
    ["audio_caixas_de_som", "caixa_de_som"],
    ["audio_microfones", "microfone"],
    ["perfumaria_perfumes_arabes", "perfume"],
    ["perfumaria_kits", "perfume"],
    ["casa_inteligente_robos_aspiradores", "robo_aspirador"],
    ["mobilidade_triciclos_patinetes", "triciclo_eletrico"],
  ];

  it.each(casosComLugarProprio)("%s -> %s (lugar próprio, não cai em acessorio)", (slug, esperado) => {
    expect(categoriaSlugParaCategoriaLoja(slug)).toBe(esperado);
  });

  it("categoria_slug realmente desconhecida cai no catch-all acessorio", () => {
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
