import { describe, it, expect } from "vitest";
import { resolverModeloCanonico } from "../modelo-catalogo";

// Fase 243: categorias novas pedidas pelo dono (23/09/2026) — generaliza
// reconhecimento de marca além de JBL/Hollyland, e adiciona Notebook
// (que não existia antes).
describe("resolverModeloCanonico — categorias novas (Fase 243)", () => {
  it("reconhece caixa de som genérica (marca não catalogada) como audio_caixas_de_som", () => {
    const r = resolverModeloCanonico("Caixa de som Sony XB13 bluetooth");
    expect(r.categoriaSlug).toBe("audio_caixas_de_som");
  });

  it("continua reconhecendo caixa de som JBL com categoria própria", () => {
    const r = resolverModeloCanonico("JBL Flip 6");
    expect(r.categoriaSlug).toBe("audio_caixas_de_som");
    expect(r.canonico).toBe("JBL Flip 6");
    expect(r.reconhecido).toBe(true);
  });

  it("reconhece microfone genérico (sem marca Hollyland) como audio_microfones", () => {
    const r = resolverModeloCanonico("Microfone de lapela sem fio duplo");
    expect(r.categoriaSlug).toBe("audio_microfones");
  });

  it("reconhece notebook com marca conhecida (Dell) como computadores_notebook, marcado reconhecido", () => {
    const r = resolverModeloCanonico("Notebook Dell Inspiron 15 8gb 256gb");
    expect(r.categoriaSlug).toBe("computadores_notebook");
    expect(r.marca).toBe("Dell");
    expect(r.reconhecido).toBe(true);
  });

  it("reconhece notebook de marca desconhecida como computadores_notebook, mas sinalizado pra revisão", () => {
    const r = resolverModeloCanonico("Notebook Positivo i5 8gb 256gb");
    expect(r.categoriaSlug).toBe("computadores_notebook");
    expect(r.reconhecido).toBe(false);
  });

  it("robô aspirador e triciclo continuam funcionando (não regrediu)", () => {
    expect(resolverModeloCanonico("Robô aspirador Xiaomi X20").categoriaSlug).toBe("casa_inteligente_robos_aspiradores");
    expect(resolverModeloCanonico("Triciclo elétrico infantil").categoriaSlug).toBe("mobilidade_triciclos_patinetes");
  });
});

// Fase 245: bug reportado pelo dono (24/09/2026) — "iPhone 12" caía em
// "não classificado" -> categoria errada na loja pública, porque só os
// modelos com entrada FIXA no catálogo eram reconhecidos (nenhum
// fallback genérico pra "iPhone <número>").
describe("resolverModeloCanonico — iPhone número solto sem entrada fixa (Fase 245)", () => {
  it("reconhece iPhone 12 (sem entrada no catálogo) como smartphones_iphone", () => {
    const r = resolverModeloCanonico("iPhone 12 128GB");
    expect(r.categoriaSlug).toBe("smartphones_iphone");
    expect(r.marca).toBe("Apple");
    expect(r.canonico).toBe("iPhone 12");
    expect(r.reconhecido).toBe(true);
  });

  it("reconhece sufixos comuns em modelos sem entrada fixa (12 Pro Max, 8)", () => {
    expect(resolverModeloCanonico("iPhone-12 Pro Max 256GB").canonico).toBe("iPhone 12 Pro Max");
    expect(resolverModeloCanonico("iPhone 8 64GB").canonico).toBe("iPhone 8");
  });

  it("modelo com entrada fixa continua vencendo o fallback genérico (não regrediu)", () => {
    const r = resolverModeloCanonico("iPhone 17 Pro Max 256gb");
    expect(r.canonico).toBe("iPhone 17 Pro Max");
    expect(r.categoriaSlug).toBe("smartphones_iphone");
  });
});
