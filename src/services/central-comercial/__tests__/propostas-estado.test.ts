import { describe, it, expect } from "vitest";
import { emNegociacao, estadoDaProposta } from "../propostas-estado";
import { distribuirValor } from "../proposta";

const agora = new Date("2026-10-15T15:00:00Z");
const ev = (tipo: string, h = 1) => ({ tipo, criado_em: `2026-10-14T${String(10 + h).padStart(2, "0")}:00:00Z` });

describe("estadoDaProposta", () => {
  it("recém-salva é 'calculada'", () => {
    expect(estadoDaProposta({ status: "criado", validade: "2026-10-20", eventos: [ev("criada")], agora })).toBe("calculada");
  });
  it("copiar ou abrir o WhatsApp é só 'compartilhada' — não vira aguardando resposta", () => {
    expect(estadoDaProposta({ status: "criado", validade: "2026-10-20", eventos: [ev("criada"), ev("copiada", 2)], agora })).toBe("compartilhada");
    expect(estadoDaProposta({ status: "criado", validade: "2026-10-20", eventos: [ev("whatsapp_aberto")], agora })).toBe("compartilhada");
  });
  it("envio confirmado vira 'aguardando resposta'", () => {
    expect(estadoDaProposta({ status: "enviado", validade: "2026-10-20", eventos: [ev("criada"), ev("enviada", 2)], agora })).toBe("aguardando_resposta");
  });
  it("aceita só vale até virar venda; aprovado no banco = convertida", () => {
    expect(estadoDaProposta({ status: "enviado", validade: null, eventos: [ev("enviada"), ev("aceita", 3)], agora })).toBe("aceita");
    expect(estadoDaProposta({ status: "aprovado", validade: null, eventos: [ev("aceita")], agora })).toBe("convertida");
  });
  it("a última resposta vence (recusou e depois voltou a negociar)", () => {
    expect(estadoDaProposta({ status: "criado", validade: null, eventos: [ev("recusada", 1), ev("aguardando_resposta", 2)], agora })).toBe("aguardando_resposta");
  });
  it("vencida por data vira expirada, mas aceita não expira", () => {
    expect(estadoDaProposta({ status: "criado", validade: "2026-10-14", eventos: [], agora })).toBe("expirada");
    expect(estadoDaProposta({ status: "criado", validade: "2026-10-14", eventos: [ev("aceita")], agora })).toBe("aceita");
    expect(estadoDaProposta({ status: "criado", validade: "2026-10-15", eventos: [], agora })).toBe("calculada"); // vale o dia inteiro
  });
  it("negociação inclui só estados em aberto", () => {
    expect(emNegociacao("aguardando_resposta")).toBe(true);
    expect(emNegociacao("convertida")).toBe(false);
    expect(emNegociacao("expirada")).toBe(false);
  });
});

describe("distribuirValor", () => {
  const soma = (l: { quantidade: number; precoUnitario: number }[], u: number[]) => Math.round(l.reduce((a, x, i) => a + x.quantidade * u[i], 0) * 100) / 100;
  it("a soma dos itens bate exatamente com o total final", () => {
    const linhas = [{ descricao: "a", quantidade: 1, precoUnitario: 3999.9 }, { descricao: "b", quantidade: 1, precoUnitario: 149.9 }, { descricao: "c", quantidade: 1, precoUnitario: 39.9 }];
    for (const total of [4000, 3871.37, 4189.7, 1234.56]) expect(soma(linhas, distribuirValor(linhas, total))).toBe(total);
  });
  it("um item só leva o total inteiro", () => {
    expect(distribuirValor([{ descricao: "a", quantidade: 1, precoUnitario: 5000 }], 4321.1)).toEqual([4321.1]);
  });
  it("resíduo cai numa linha de quantidade 1, preservando as de quantidade maior", () => {
    const linhas = [{ descricao: "capa", quantidade: 3, precoUnitario: 33.33 }, { descricao: "iphone", quantidade: 1, precoUnitario: 1000 }];
    expect(soma(linhas, distribuirValor(linhas, 1000))).toBe(1000);
  });
  it("lista vazia e total zero não quebram", () => {
    expect(distribuirValor([], 10)).toEqual([]);
    expect(distribuirValor([{ descricao: "a", quantidade: 1, precoUnitario: 0 }], 0)).toEqual([0]);
  });
});
