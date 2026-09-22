import { describe, it, expect } from "vitest";
import { parseRealezaAppleLacrados } from "../parser-realeza-apple";
import { calcularPlanoAplicacao, chaveIdentidade, type ItemArmazenado } from "../aplicacao-diff";
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
