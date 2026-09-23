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

  // Fase 243: categorias novas roteadas pro mesmo tipo_lista "audio_extras"
  // (parser livre, sem catálogo fixo — igual robô aspirador/triciclo já usavam).
  it("classifica lista com Notebook como audio_extras", () => {
    const r = classificarMensagem("Notebook Dell Inspiron 8gb/256 🔵 3200\nNotebook Lenovo Ideapad 8gb/512 ⚫ 3600", "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("audio_extras");
  });

  it("classifica lista com Caixa de som genérica (sem JBL) como audio_extras", () => {
    const r = classificarMensagem("Caixa de som Sony bluetooth 🔵 450\nCaixinha de som mini ⚫ 120", "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("audio_extras");
  });

  it("classifica lista com Microfone genérico como audio_extras", () => {
    const r = classificarMensagem("Microfone lapela sem fio 🔵 280\nMicrofone de mesa USB ⚫ 350", "realeza");
    expect(r.classificacao).toBe("lista");
    expect(r.tipoLista).toBe("audio_extras");
  });
});
