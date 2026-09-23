import { describe, it, expect } from "vitest";
import { parseRealezaAppleLacrados } from "../parser-realeza-apple";
import { calcularPlanoAplicacao, chaveIdentidade, avaliarTravasDeSeguranca, type ItemArmazenado, type PlanoAplicacao } from "../aplicacao-diff";
import type { ItemExtraido } from "../tipos";
import {
  FIXTURE_2_REALEZA_APPLE_LACRADOS_V1,
  FIXTURE_3_REALEZA_APPLE_LACRADOS_V2,
} from "../__fixtures__/mensagens-reais";

/** Simula itens já "salvos" (com id) a partir do resultado de um parse anterior. */
function comoArmazenados(itens: ReturnType<typeof parseRealezaAppleLacrados>["itens"]): ItemArmazenado[] {
  return itens.map((item, idx) => ({ ...item, id: `id-${idx}-${chaveIdentidade(item)}` }));
}

describe("aplicacao-diff — reenvio Realeza Apple lacrados (fixture 2 → fixture 3)", () => {
  const v1 = parseRealezaAppleLacrados(FIXTURE_2_REALEZA_APPLE_LACRADOS_V1);
  const anteriores = comoArmazenados(v1.itens);
  const v2 = parseRealezaAppleLacrados(FIXTURE_3_REALEZA_APPLE_LACRADOS_V2);
  const plano = calcularPlanoAplicacao(v2.itens, anteriores);

  it("atualiza o preço do MacBook Neo (Roxo e Azul) mantendo o mesmo id — 4697 → 4650", () => {
    const macbookUpdates = plano.atualizarPreco.filter((u) => /macbook/i.test(u.item.modeloCanonico));
    expect(macbookUpdates).toHaveLength(2);
    for (const u of macbookUpdates) {
      expect(u.precoAntigo).toBe(4697);
      expect(u.precoNovo).toBe(4650);
      expect(u.id).toBe(u.item.id); // mesmo id — não quebra o link da loja
    }
  });

  it("iPhone 17e Branco e Lavanda/Roxo mudam de 3967 para 3899", () => {
    const updates = plano.atualizarPreco.filter((u) => /17e/i.test(u.item.modeloCanonico));
    expect(updates.length).toBeGreaterThanOrEqual(1);
    for (const u of updates) {
      expect(u.precoAntigo).toBe(3967);
      expect(u.precoNovo).toBe(3899);
    }
  });

  it("iPhone 17 256GB Lavanda sai (desativado) — não está mais na v2", () => {
    const desativados = plano.desativar.filter((d) => /^iphone 17$/i.test(d.modeloCanonico));
    expect(desativados.length).toBeGreaterThanOrEqual(1);
    expect(desativados.some((d) => d.corBase === "Lavanda" || d.cor === "Lavanda")).toBe(true);
  });

  it("iPhone 18 Pro Max 512GB Preto entra como item novo (antes tinha comentário e foi descartado)", () => {
    const novo = plano.inserir.find((i) => /18 pro max/i.test(i.modeloCanonico) && i.precoFornecedor === 12999);
    expect(novo).toBeTruthy();
  });

  it("itens sem mudança nenhuma (mesmo preço) ficam em semMudanca", () => {
    const semMudancaModelos = plano.semMudanca.map((i) => i.modeloCanonico);
    // iPhone 14, iPhone 15, iPhone 16 Plus, Watches etc. não mudaram de preço
    expect(semMudancaModelos.some((m) => /iphone 14$/i.test(m))).toBe(true);
  });
});

describe("avaliarTravasDeSeguranca — variação de preço retém só o item, não trava a lista inteira", () => {
  // Bug relatado pelo dono (22/09/2026): quando 1 item tinha variação de
  // preço >30%, a lista inteira travava — e como o baseline nunca
  // avançava enquanto travada, TODAS as listas seguintes do mesmo
  // fornecedor/tipo travavam também ("mandou várias e não sobe").
  function itemBase(overrides: Partial<ItemExtraido> = {}): ItemExtraido {
    return {
      categoriaSlug: "smartphones_iphone",
      marca: "Apple",
      modeloCanonico: "iPhone 15",
      modeloReconhecido: true,
      condicao: "Lacrado",
      armazenamentoGb: 128,
      ramGb: null,
      ramPossivelTypo: false,
      conectividade: null,
      nfc: false,
      tamanhoMm: null,
      gpsCellular: null,
      cor: "Preto",
      corBase: "Preto",
      corEmojiOrigem: null,
      bateriaPct: null,
      cidade: null,
      garantia: null,
      quantidade: 1,
      tags: [],
      fornecedor: "realeza",
      tipoLista: "apple_lacrados",
      precoFornecedor: 2000,
      linhaOrigem: "",
      ...overrides,
    };
  }

  it("bloqueia a lista inteira quando o volume cai muito (queda >50%)", () => {
    const anteriores: ItemArmazenado[] = Array.from({ length: 10 }, (_, i) =>
      ({ ...itemBase({ modeloCanonico: `iPhone ${i}` }), id: `id-${i}` })
    );
    const novos = [itemBase()];
    const plano = calcularPlanoAplicacao(novos, anteriores);
    const travas = avaliarTravasDeSeguranca(plano, anteriores, { itensNovosValidos: novos, descartados: 0 });
    expect(travas.bloqueado).toBe(true);
  });

  it("NÃO bloqueia a lista inteira por causa de 1 item com variação de preço absurda — só retém aquele item", () => {
    const itemEstavel: ItemArmazenado = { ...itemBase({ modeloCanonico: "iPhone 14", precoFornecedor: 1000 }), id: "id-estavel" };
    const itemComVariacao: ItemArmazenado = { ...itemBase({ modeloCanonico: "iPhone 15", precoFornecedor: 2000 }), id: "id-variacao" };
    const anteriores = [itemEstavel, itemComVariacao];

    const novos = [
      itemBase({ modeloCanonico: "iPhone 14", precoFornecedor: 1000 }), // sem mudança
      itemBase({ modeloCanonico: "iPhone 15", precoFornecedor: 5000 }), // +150%, bem acima do limite de 30%
    ];

    const plano = calcularPlanoAplicacao(novos, anteriores);
    const travas = avaliarTravasDeSeguranca(plano, anteriores, { itensNovosValidos: novos, descartados: 0 });

    expect(travas.bloqueado).toBe(false);
    expect(travas.itensRetidos).toHaveLength(1);
    expect(travas.itensRetidos[0].id).toBe("id-variacao");
    expect(travas.motivosRetencao[0]).toMatch(/variação de preço/i);
  });

  it("NÃO bloqueia lista de audio_extras por 'cor não identificada' — caixa de som/cabo/fone normalmente não tem cor", () => {
    const semCor = { ...itemBase({ tipoLista: "audio_extras", modeloCanonico: "JBL Charge 5", cor: "Não informada" }), flags: ["cor_nao_informada"] };
    const plano: PlanoAplicacao = { inserir: [semCor], atualizarPreco: [], desativar: [], semMudanca: [] };
    const travas = avaliarTravasDeSeguranca(plano, [], { itensNovosValidos: [semCor], descartados: 0 });
    expect(travas.bloqueado).toBe(false);
  });

  it("continua bloqueando por 'cor não identificada' em listas de celular (iphone/android)", () => {
    const semCor = { ...itemBase({ tipoLista: "apple_lacrados", modeloCanonico: "iPhone 15", cor: "Não informada" }), flags: ["cor_nao_informada"] };
    const plano: PlanoAplicacao = { inserir: [semCor], atualizarPreco: [], desativar: [], semMudanca: [] };
    const travas = avaliarTravasDeSeguranca(plano, [], { itensNovosValidos: [semCor], descartados: 0 });
    expect(travas.bloqueado).toBe(true);
  });
});
