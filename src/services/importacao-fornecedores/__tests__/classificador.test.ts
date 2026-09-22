import { describe, it, expect } from "vitest";
import { classificarMensagem } from "../classificador";
import {
  FIXTURE_1_GOAT_COMPLETA,
  FIXTURE_2_REALEZA_APPLE_LACRADOS_V1,
  FIXTURE_4_REALEZA_ANDROID,
  FIXTURE_5_REALEZA_PERFUMES,
  FIXTURE_6_REALEZA_JBL_EXTRAS,
  FIXTURE_7_IGNORAR_1,
  FIXTURE_7_IGNORAR_2,
  FIXTURE_7_IGNORAR_3,
} from "../__fixtures__/mensagens-reais";

describe("classificarMensagem", () => {
  it("classifica a lista completa da Goat como lista/goat_completa", () => {
    const r = classificarMensagem(FIXTURE_1_GOAT_COMPLETA, "goat");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("goat_completa");
  });

  it("classifica Apple lacrados da Realeza corretamente", () => {
    const r = classificarMensagem(FIXTURE_2_REALEZA_APPLE_LACRADOS_V1, "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("apple_lacrados");
  });

  it("classifica Android/tablets da Realeza corretamente", () => {
    const r = classificarMensagem(FIXTURE_4_REALEZA_ANDROID, "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("android");
  });

  it("classifica Perfumes árabes da Realeza corretamente", () => {
    const r = classificarMensagem(FIXTURE_5_REALEZA_PERFUMES, "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("perfumes");
  });

  it("classifica JBL/extras da Realeza corretamente", () => {
    const r = classificarMensagem(FIXTURE_6_REALEZA_JBL_EXTRAS, "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("audio_extras");
  });

  it("ignora as 3 mensagens avulsas/conversa (fixture 7)", () => {
    for (const msg of [FIXTURE_7_IGNORAR_1, FIXTURE_7_IGNORAR_2, FIXTURE_7_IGNORAR_3]) {
      const r = classificarMensagem(msg, "realeza");
      expect(r.classificacao).toBe("ignorar");
      expect(r.tipoLista).toBeNull();
    }
  });
});
