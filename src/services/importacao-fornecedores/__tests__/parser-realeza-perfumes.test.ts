import { describe, it, expect } from "vitest";
import { parseRealezaPerfumes } from "../parser-realeza-perfumes";
import { FIXTURE_5_REALEZA_PERFUMES } from "../__fixtures__/mensagens-reais";

describe("parser-realeza-perfumes — fixture 5", () => {
  const resultado = parseRealezaPerfumes(FIXTURE_5_REALEZA_PERFUMES);

  it("quantidade = primeiro número, preço = último; ✅ ignorado", () => {
    const item = resultado.itens.find((it) => /KINGDOM/i.test(it.modeloCanonico));
    expect(item?.quantidade).toBe(3);
    expect(item?.precoFornecedor).toBe(210);
  });

  it("sem cor (não se aplica a perfume)", () => {
    expect(resultado.itens.every((it) => it.cor === "Não se aplica")).toBe(true);
  });

  it("'KIT'/'PCS' → Kits de perfume; demais → Perfumes árabes", () => {
    const kit = resultado.itens.find((it) => /KHAMRAH DUKHAN/i.test(it.modeloCanonico));
    // KHAMRAH DUKHAN não é kit
    expect(kit?.categoriaSlug).toBe("perfumaria_perfumes_arabes");

    const kitDeVerdade = resultado.itens.find((it) => /KIT THE KINGDOM/i.test(it.modeloCanonico));
    expect(kitDeVerdade?.categoriaSlug).toBe("perfumaria_kits");

    const pcs = resultado.itens.find((it) => /KIT KHAMRAH 3 PCS/i.test(it.modeloCanonico));
    expect(pcs?.categoriaSlug).toBe("perfumaria_kits");
  });

  it("'DELILAH BLANC' 148 e 164 → ambíguo, descartado e registrado", () => {
    const delilah = resultado.itens.filter((it) => /DELILAH BLANC/i.test(it.modeloCanonico));
    expect(delilah).toHaveLength(0);
    const descartes = resultado.descartados.filter((d) => /DELILAH BLANC/i.test(d.descricao) && d.motivo === "ambiguo");
    expect(descartes).toHaveLength(2);
  });

  it("'SABAH DELILAH' (nome diferente) não é afetado pela ambiguidade de 'DELILAH BLANC'", () => {
    const item = resultado.itens.find((it) => it.modeloCanonico.toUpperCase() === "SABAH DELILAH");
    expect(item).toBeTruthy();
    expect(item?.precoFornecedor).toBe(149);
  });

  it("total de itens não-ambíguos extraídos corretamente", () => {
    // 41 linhas de produto no total, 2 são DELILAH BLANC (ambíguo, descartadas) => 39 itens
    expect(resultado.itens.length).toBe(39);
  });
});
