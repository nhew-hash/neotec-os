import { describe, it, expect } from "vitest";
import { parseRealezaLinhaUnica } from "../parser-realeza-linha-unica";
import { FIXTURE_4_REALEZA_ANDROID, FIXTURE_6_REALEZA_JBL_EXTRAS } from "../__fixtures__/mensagens-reais";

describe("parser-realeza-linha-unica — fixture 4 (Android/tablets)", () => {
  const resultado = parseRealezaLinhaUnica(FIXTURE_4_REALEZA_ANDROID, "android");

  it("garantia de todos os itens é 'sem garantia' (cabeçalho)", () => {
    expect(resultado.itens.length).toBeGreaterThan(0);
    expect(resultado.itens.every((it) => it.garantia === "sem garantia")).toBe(true);
  });

  it("um item por emoji: Redmi 15C 128/4 → Azul, Verde, Preto a 839", () => {
    const itens = resultado.itens.filter((it) => it.precoFornecedor === 839 && /redmi 15c/i.test(it.modeloCanonico));
    expect(itens).toHaveLength(3);
    const cores = itens.map((i) => i.corBase).sort();
    expect(cores).toEqual(["Azul", "Preto", "Verde"].sort());
  });

  it("um item por emoji: Poco X8 Pro Max 512/12 → Preto, Azul, Branco a 3169", () => {
    const itens = resultado.itens.filter((it) => it.precoFornecedor === 3169);
    expect(itens).toHaveLength(3);
  });

  it("Xiaomi Pad 2 256/8 → Cinza e Verde a 1380", () => {
    const itens = resultado.itens.filter((it) => it.precoFornecedor === 1380);
    expect(itens).toHaveLength(2);
    expect(itens.every((i) => i.categoriaSlug === "tablets_android")).toBe(true);
  });

  it("Tablet infantil vai pra tablets-infantis", () => {
    const infantis = resultado.itens.filter((it) => it.categoriaSlug === "tablets_infantil");
    expect(infantis.length).toBeGreaterThanOrEqual(2); // 64/4 e 128/4
  });

  it("'Note ...' vira 'Redmi Note ...'", () => {
    const notes = resultado.itens.filter((it) => /redmi note/i.test(it.modeloCanonico));
    expect(notes.length).toBeGreaterThan(0);
  });

  it("armazenamento/RAM: '256/16g' = 256GB/16GB RAM", () => {
    const item = resultado.itens.find((it) => it.precoFornecedor === 1049 && /redmi 15/i.test(it.modeloCanonico));
    expect(item?.armazenamentoGb).toBe(256);
    expect(item?.ramGb).toBe(16);
  });

  it("'258/8' é sinalizado como possível typo de 256", () => {
    const item = resultado.itens.find((it) => it.precoFornecedor === 2269);
    expect(item?.armazenamentoGb).toBe(258);
    expect(item?.ramPossivelTypo).toBe(true);
  });

  it("Redmi 15C 256/16 (sem NFC) e com NFC são itens diferentes", () => {
    const semNfc = resultado.itens.find((it) => it.precoFornecedor === 1049);
    const comNfc = resultado.itens.find((it) => it.precoFornecedor === 1069);
    expect(semNfc?.nfc).toBe(false);
    expect(comNfc?.nfc).toBe(true);
  });

  it("'lançamento 🚀' é aceito como tag, não descarta o item", () => {
    const item = resultado.itens.find((it) => it.precoFornecedor === 1999);
    expect(item).toBeTruthy();
    expect(item?.tags).toContain("lançamento");
  });

  it("nenhum item foi descartado por comentário nesta lista", () => {
    expect(resultado.descartados).toHaveLength(0);
  });
});

describe("parser-realeza-linha-unica — fixture 6 (JBL/extras)", () => {
  const resultado = parseRealezaLinhaUnica(FIXTURE_6_REALEZA_JBL_EXTRAS, "audio_extras");

  it("JBL Boombox 4 → Preto 2099 e Branco 2149 (cores diferentes, não ambíguo; ⚪️⚪️ = uma cor)", () => {
    const preto = resultado.itens.find((it) => it.precoFornecedor === 2099);
    const branco = resultado.itens.find((it) => it.precoFornecedor === 2149);
    expect(preto?.corBase).toBe("Preto");
    expect(branco?.corBase).toBe("Branco/Prata");
    // ⚪️⚪️ não deve virar 2 itens brancos
    const itensA2149 = resultado.itens.filter((it) => it.precoFornecedor === 2149);
    expect(itensA2149).toHaveLength(1);
  });

  it("Triciclo Drift 300W → Azul e Laranja", () => {
    const itens = resultado.itens.filter((it) => it.precoFornecedor === 899);
    expect(itens).toHaveLength(2);
    expect(itens.every((i) => i.categoriaSlug === "mobilidade_triciclos_patinetes")).toBe(true);
  });

  it("'xiaomi extras' marca contexto Xiaomi pros itens abaixo", () => {
    const fone = resultado.itens.find((it) => it.precoFornecedor === 79);
    expect(fone?.marca).toBe("Xiaomi");
    const robo = resultado.itens.find((it) => it.precoFornecedor === 3099);
    expect(robo?.marca).toBe("Xiaomi");
    expect(robo?.categoriaSlug).toBe("casa_inteligente_robos_aspiradores");
  });

  it("'449,' vira 449.00", () => {
    const item = resultado.itens.find((it) => /grip/i.test(it.modeloCanonico));
    expect(item?.precoFornecedor).toBe(449);
  });

  it("Combo Hollyland vai pra microfones, cor Não informada", () => {
    const item = resultado.itens.find((it) => it.precoFornecedor === 630);
    expect(item?.categoriaSlug).toBe("audio_microfones");
    expect(item?.cor).toBe("Não informada");
  });
});

// Fase 246 (24/09/2026): trava a distinção de destino entre os dois usos
// deste parser — "android" precisa continuar indo pro catálogo de
// lacrados (mostrado em /loja/android, filtrado por marca != apple —
// é o "lugar" único Android/Tablet que a loja usa) e "audio_extras"
// precisa ir pro produto genérico (não existe página de lacrados pra
// JBL/notebook/robô/etc — regressão real corrigida na Fase 245).
describe("parser-realeza-linha-unica — condicao por tipoLista (Fase 246)", () => {
  it("tipoLista 'android' produz condicao Lacrado (Samsung, Xiaomi, tablets)", () => {
    const r = parseRealezaLinhaUnica(FIXTURE_4_REALEZA_ANDROID, "android");
    expect(r.itens.length).toBeGreaterThan(0);
    expect(r.itens.every((i) => i.condicao === "Lacrado")).toBe(true);
  });

  it("tipoLista 'audio_extras' produz condicao null (JBL, triciclo, robô, etc)", () => {
    const r = parseRealezaLinhaUnica(FIXTURE_6_REALEZA_JBL_EXTRAS, "audio_extras");
    expect(r.itens.length).toBeGreaterThan(0);
    expect(r.itens.every((i) => i.condicao === null)).toBe(true);
  });
});
