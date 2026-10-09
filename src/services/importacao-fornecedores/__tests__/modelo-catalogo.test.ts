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

describe("resolverModeloCanonico — famílias Apple não-iPhone (iPad, Mac, Watch, AirPods)", () => {
  it.each([
    ["iPad Air 11 M3 256GB", "iPad Air 11", "tablets_ipad"],
    ["iPad 10 64GB", "iPad 10", "tablets_ipad"],
    ["Macbook 💻 neo 256/8", "MacBook Neo", "computadores_macbook"],
    ["MacBook Air 13 M4", "MacBook Air 13", "computadores_macbook"],
    ["iMac 24", "iMac", "computadores_macbook"],
    ["Apple Watch S9 46mm", "Apple Watch Series 9", "smartwatches_apple_watch"],
    ["Apple Watch Series 3 42mm", "Apple Watch Series 3", "smartwatches_apple_watch"],
    ["Apple wacht s10", "Apple Watch Series 10", "smartwatches_apple_watch"],
    ["Apple Watch Ultra 3", "Apple Watch Ultra 3", "smartwatches_apple_watch"],
    ["AirPods Pro 2", "AirPods Pro 2", "acessorios_apple"],
  ])("%s → %s", (linha, canonico, categoria) => {
    const r = resolverModeloCanonico(linha);
    expect(r).toMatchObject({ canonico, marca: "Apple", categoriaSlug: categoria, reconhecido: true });
  });

  it("não confunde relógio de outra marca com Apple Watch", () => {
    expect(resolverModeloCanonico("Galaxy Watch 7 44mm").marca).not.toBe("Apple");
  });

  it("modelos que já tinham entrada fixa não mudam de nome (identidade dos itens ativos preservada)", () => {
    expect(resolverModeloCanonico("iPad 11 128GB").canonico).toBe("iPad 11");
    expect(resolverModeloCanonico("Apple Watch Series 11").canonico).toBe("Apple Watch Series 11");
    expect(resolverModeloCanonico("Apple Watch SE").canonico).toBe("Apple Watch SE");
  });
});
