import { describe, it, expect } from "vitest";
import { validarItens } from "../validacao";
import { parseGoat } from "../parser-goat";
import { parseRealezaAppleLacrados } from "../parser-realeza-apple";
import { FIXTURE_1_GOAT_COMPLETA, FIXTURE_2_REALEZA_APPLE_LACRADOS_V1 } from "../__fixtures__/mensagens-reais";

describe("validarItens — rede de segurança final", () => {
  it("não descarta itens já válidos do parser da Goat (fixture 1)", () => {
    const bruto = parseGoat(FIXTURE_1_GOAT_COMPLETA);
    const validado = validarItens(bruto);
    // todos os itens que passaram no parser continuam válidos (nenhum novo descarte)
    expect(validado.itens.length).toBe(bruto.itens.length);
    expect(validado.descartados.length).toBe(bruto.descartados.length);
  });

  it("não descarta itens já válidos do parser da Realeza Apple lacrados (fixture 2)", () => {
    const bruto = parseRealezaAppleLacrados(FIXTURE_2_REALEZA_APPLE_LACRADOS_V1);
    const validado = validarItens(bruto);
    expect(validado.itens.length).toBe(bruto.itens.length);
  });

  it("descarta item com preço inválido (0 ou negativo)", () => {
    const resultado = validarItens({
      itens: [
        {
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
          corEmojiOrigem: "⚫️",
          bateriaPct: null,
          cidade: null,
          garantia: null,
          quantidade: 1,
          tags: [],
          fornecedor: "realeza",
          tipoLista: "apple_lacrados",
          precoFornecedor: 0,
          linhaOrigem: "teste",
        },
      ],
      descartados: [],
    });
    expect(resultado.itens).toHaveLength(0);
    expect(resultado.descartados[0]?.motivo).toBe("preco_invalido");
  });

  it("detecta ambiguidade genérica: mesmo modelo+spec+cor+condição, preços diferentes, sem bateria/cidade distintiva", () => {
    const base = {
      categoriaSlug: "perfumaria_perfumes_arabes",
      marca: "Não informada",
      modeloCanonico: "DELILAH BLANC",
      modeloReconhecido: true,
      condicao: null,
      armazenamentoGb: null,
      ramGb: null,
      ramPossivelTypo: false,
      conectividade: null,
      nfc: false,
      tamanhoMm: null,
      gpsCellular: null,
      cor: "Não se aplica",
      corBase: "Não se aplica",
      corEmojiOrigem: null,
      bateriaPct: null,
      cidade: null,
      garantia: null,
      quantidade: 1,
      tags: [],
      fornecedor: "realeza" as const,
      tipoLista: "perfumes" as const,
    };
    const resultado = validarItens({
      itens: [
        { ...base, precoFornecedor: 148, linhaOrigem: "linha 1" },
        { ...base, precoFornecedor: 164, linhaOrigem: "linha 2" },
      ],
      descartados: [],
    });
    expect(resultado.itens).toHaveLength(0);
    expect(resultado.descartados.filter((d) => d.motivo === "ambiguo")).toHaveLength(2);
  });
});

import { validarItens as validarItensFaixa } from "../validacao";
import type { ItemExtraido as ItemFaixa } from "../tipos";

describe("faixa de preço — abaixo do mínimo descarta (auditoria 2026-10)", () => {
  const base = { categoriaSlug: "acessorios_apple", marca: "Apple", modeloCanonico: "AirPods 4", modeloReconhecido: true, condicao: "Lacrado", armazenamentoGb: null, ramGb: null, ramPossivelTypo: false, conectividade: null, nfc: false, tamanhoMm: null, gpsCellular: null, cor: "Branco", corBase: "Branco", corEmojiOrigem: null, bateriaPct: null, cidade: null, garantia: null, quantidade: 1, tags: [], fornecedor: "realeza", tipoLista: "apple_mac_ipad_airpods", linhaOrigem: "x" } as unknown as ItemFaixa;
  it("número do modelo lido como preço (R$ 4) não vai para o site", () => {
    const r = validarItensFaixa({ itens: [{ ...base, precoFornecedor: 4 }], descartados: [] });
    expect(r.itens).toHaveLength(0);
    expect(r.descartados[0].motivo).toBe("preco_implausivel");
  });
  it("preço normal passa; acima do máximo só sinaliza", () => {
    expect(validarItensFaixa({ itens: [{ ...base, precoFornecedor: 899 }], descartados: [] }).itens).toHaveLength(1);
    const caro = validarItensFaixa({ itens: [{ ...base, precoFornecedor: 99999 }], descartados: [] });
    expect(caro.itens).toHaveLength(1);
    expect(caro.itens[0].flags[0]).toMatch(/preco_fora_da_faixa/);
  });
});
