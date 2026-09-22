import { describe, it, expect } from "vitest";
import { montarResumoWhatsApp } from "../resumo";
import type { PlanoAplicacao, ItemArmazenado } from "../aplicacao-diff";

function itemFake(overrides: Partial<ItemArmazenado> = {}): ItemArmazenado {
  return {
    id: "id-1",
    categoriaSlug: "computadores_macbook",
    marca: "Apple",
    modeloCanonico: "MacBook Neo",
    modeloReconhecido: true,
    condicao: "Lacrado",
    armazenamentoGb: 256,
    ramGb: 8,
    ramPossivelTypo: false,
    conectividade: null,
    nfc: false,
    tamanhoMm: null,
    gpsCellular: null,
    cor: "Roxo/Lilás",
    corBase: "Roxo/Lilás",
    corEmojiOrigem: "🟣",
    bateriaPct: null,
    cidade: null,
    garantia: null,
    quantidade: 1,
    tags: [],
    fornecedor: "realeza",
    tipoLista: "apple_lacrados",
    precoFornecedor: 4650,
    linhaOrigem: "teste",
    ...overrides,
  };
}

describe("montarResumoWhatsApp", () => {
  it("monta o resumo no formato do exemplo da spec", () => {
    const plano: PlanoAplicacao = {
      inserir: [],
      atualizarPreco: [
        { id: "id-1", item: itemFake(), precoAntigo: 4697, precoNovo: 4650 },
        { id: "id-2", item: itemFake({ id: "id-2" }), precoAntigo: 3967, precoNovo: 3899 },
      ],
      desativar: [itemFake({ modeloCanonico: "iPhone 17", cor: "Lavanda" })],
      semMudanca: new Array(20).fill(0).map((_, i) => itemFake({ id: `sm-${i}` })),
    };
    const resumo = montarResumoWhatsApp("realeza", "apple_lacrados", plano, [
      { linhaOrigem: "x", descricao: "iPhone 15 Pro", motivo: "cpo" },
      { linhaOrigem: "y", descricao: "iPhone 15 Pro 128", motivo: "cpo" },
    ]);

    expect(resumo).toContain("Realeza · Apple lacrados:");
    expect(resumo).toContain("22 itens");
    expect(resumo).toContain("2 preços mudaram (MacBook Neo 4697→4650)");
    expect(resumo).toContain("1 saiu (iPhone 17 Lavanda)");
    expect(resumo).toContain("2 descartados (2 CPO)");
  });
});
