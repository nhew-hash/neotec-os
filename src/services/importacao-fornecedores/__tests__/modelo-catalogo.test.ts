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
