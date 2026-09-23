import { describe, it, expect } from "vitest";
import { parseRealezaAppleSeminovos } from "../parser-realeza-apple-seminovos";
import { FIXTURE_8_REALEZA_APPLE_SEMINOVOS } from "../__fixtures__/mensagens-reais";

// Fase 244: parser novo pra "*semi novos 30 dias de garantia*" da Realeza,
// construído em cima da mensagem real que o dono mandou em 23/09/2026
// (formato compacto: modelo só com número, sem "iPhone" escrito;
// armazenamento antes ou depois da bateria; várias unidades por linha).
describe("parseRealezaAppleSeminovos", () => {
  it("reconhece modelo básico com 1 unidade (13 128G 85% azul)", () => {
    const r = parseRealezaAppleSeminovos("📲13 128G 85%🔵 1780,0");
    expect(r.itens).toHaveLength(1);
    const item = r.itens[0];
    expect(item.modeloCanonico).toBe("iPhone 13");
    expect(item.armazenamentoGb).toBe(128);
    expect(item.bateriaPct).toBe(85);
    expect(item.cor).toBe("Azul");
    expect(item.condicao).toBe("Seminovo");
    expect(item.categoriaSlug).toBe("smartphones_iphone");
    expect(item.tipoLista).toBe("apple_seminovos");
    expect(item.precoFornecedor).toBe(1780);
    // garantia só é extraída do cabeçalho da mensagem completa, não de 1 linha isolada
    expect(item.garantia).toBeNull();
  });

  it("divide 1 linha com múltiplas baterias antes de 1 emoji em várias unidades da mesma cor (13 256G)", () => {
    const r = parseRealezaAppleSeminovos("📲13 256G 90% 100%🔵 86%💜1899,0");
    expect(r.itens).toHaveLength(3);
    expect(r.itens.every((i) => i.modeloCanonico === "iPhone 13" && i.armazenamentoGb === 256 && i.precoFornecedor === 1899)).toBe(true);
    const combos = r.itens.map((i) => `${i.bateriaPct}-${i.cor}`).sort();
    expect(combos).toEqual(["100-Azul", "86-Roxo/Lilás", "90-Azul"].sort());
  });

  it("reconhece sufixo PRO e PRO MAX corretamente", () => {
    const pro = parseRealezaAppleSeminovos("📲13 PRO 128G 90% 92%⚪️88%💛2280");
    expect(pro.itens.every((i) => i.modeloCanonico === "iPhone 13 Pro")).toBe(true);
    expect(pro.itens).toHaveLength(3);

    const proMax = parseRealezaAppleSeminovos("📲13 PRO MAX 128G 90%💚2649");
    expect(proMax.itens).toHaveLength(1);
    expect(proMax.itens[0].modeloCanonico).toBe("iPhone 13 Pro Max");
  });

  it("marcador 🧨 vira tag 'atencao' e não impede o parsing", () => {
    const r = parseRealezaAppleSeminovos("📲🧨🧨13 PRO MAX 128G 90%💚2649");
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].modeloCanonico).toBe("iPhone 13 Pro Max");
    expect(r.itens[0].tags).toContain("atencao");
  });

  it("descarta unidade com bateria < 80% (motivo bateria_baixa)", () => {
    const r = parseRealezaAppleSeminovos("📲14 128G 72% ⚫️1699,0");
    expect(r.itens).toHaveLength(0);
    expect(r.descartados).toHaveLength(1);
    expect(r.descartados[0].motivo).toBe("bateria_baixa");
  });

  it("captura observação livre no meio da linha sem descartar (tela com um trincadinho)", () => {
    const r = parseRealezaAppleSeminovos("📲14 128G tela com um trincadinho 82%⚫️1599");
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].bateriaPct).toBe(82);
    expect(r.itens[0].tags.some((t) => t.includes("tela com um trincadinho"))).toBe(true);
  });

  it("reconhece armazenamento mesmo quando vem DEPOIS da bateria (14 PLUS 84% 128G)", () => {
    const r = parseRealezaAppleSeminovos("📲14 PLUS 84% 128G🔵2149,0");
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].modeloCanonico).toBe("iPhone 14 Plus");
    expect(r.itens[0].armazenamentoGb).toBe(128);
    expect(r.itens[0].bateriaPct).toBe(84);
    expect(r.itens[0].cor).toBe("Azul");
  });

  it("associa emoji(s) que aparecem ANTES da bateria, em ordem (16 PRO 512G🩶💛90%91%)", () => {
    const r = parseRealezaAppleSeminovos("📲16 PRO 512G🩶💛90%91%4499");
    expect(r.itens).toHaveLength(2);
    const combos = r.itens.map((i) => `${i.bateriaPct}-${i.cor}`).sort();
    expect(combos).toEqual(["90-Cinza/Prata/Natural", "91-Amarelo/Dourado"].sort());
    expect(r.itens.every((i) => i.modeloCanonico === "iPhone 16 Pro" && i.armazenamentoGb === 512)).toBe(true);
  });

  it("reconhece 16E como iPhone 16e", () => {
    const r = parseRealezaAppleSeminovos("📲16E 128G 87%⚫️ 2450");
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].modeloCanonico).toBe("iPhone 16e");
  });

  it("parseia formatos de preço inconsistentes (vírgula com 1 e 2 casas, sem casa)", () => {
    expect(parseRealezaAppleSeminovos("📲13 128G 85%🔵 1780,0").itens[0].precoFornecedor).toBe(1780);
    expect(parseRealezaAppleSeminovos("📲13 PRO 128G 90%⚪️2280").itens[0].precoFornecedor).toBe(2280);
    expect(parseRealezaAppleSeminovos("📲15 PRO MAX 256G 81%🔵3700,00").itens[0].precoFornecedor).toBe(3700);
  });

  it("processa a mensagem real completa (FIXTURE_8) sem quebrar e sem perder unidades óbvias", () => {
    const r = parseRealezaAppleSeminovos(FIXTURE_8_REALEZA_APPLE_SEMINOVOS);
    // todo item extraído deve estar bem formado (sem quebrar o parser em nenhuma linha)
    expect(r.itens.length).toBeGreaterThan(20);
    for (const item of r.itens) {
      expect(item.condicao).toBe("Seminovo");
      expect(item.categoriaSlug).toBe("smartphones_iphone");
      expect(item.marca).toBe("Apple");
      expect(item.bateriaPct).not.toBeNull();
      expect(item.bateriaPct as number).toBeGreaterThanOrEqual(80);
      expect(item.precoFornecedor).toBeGreaterThan(0);
      expect(item.garantia).toBe("30 dias");
    }
    // as duas unidades de 79% (marcadas com 🧨🧨) devem ter sido descartadas por bateria baixa
    expect(r.descartados.some((d) => d.motivo === "bateria_baixa" && d.detalhe === "79%")).toBe(true);
    expect(r.descartados.some((d) => d.motivo === "bateria_baixa" && d.detalhe === "72%")).toBe(true);
  });
});
