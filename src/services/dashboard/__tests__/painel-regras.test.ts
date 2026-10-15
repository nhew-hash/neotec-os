import { describe, it, expect } from "vitest";
import { cardEstaParado, contarCardsParados, diasNaEtapa, janelaDeHoje } from "../painel-regras";

const agora = new Date("2026-10-15T15:00:00Z"); // 12h em Brasília

describe("diasNaEtapa / cardEstaParado", () => {
  it("conta dias inteiros na etapa", () => {
    expect(diasNaEtapa("2026-10-10T15:00:00Z", agora)).toBe(5);
  });
  it("só considera parado quando a etapa tem alerta configurado", () => {
    const card = { id: "c", etapa_id: "e", entrou_etapa_em: "2026-10-01T00:00:00Z", perdido: false };
    expect(cardEstaParado(card, { id: "e", dias_para_alerta: 3 }, agora)).toBe(true);
    expect(cardEstaParado(card, { id: "e", dias_para_alerta: null }, agora)).toBe(false);
    expect(cardEstaParado(card, undefined, agora)).toBe(false);
  });
  it("card perdido nunca conta", () => {
    const card = { id: "c", etapa_id: "e", entrou_etapa_em: "2026-10-01T00:00:00Z", perdido: true };
    expect(cardEstaParado(card, { id: "e", dias_para_alerta: 1 }, agora)).toBe(false);
  });
  it("conta vários cards", () => {
    const etapas = [{ id: "a", dias_para_alerta: 2 }, { id: "b", dias_para_alerta: null }];
    const cards = [
      { id: "1", etapa_id: "a", entrou_etapa_em: "2026-10-01T00:00:00Z", perdido: false },
      { id: "2", etapa_id: "a", entrou_etapa_em: "2026-10-15T00:00:00Z", perdido: false },
      { id: "3", etapa_id: "b", entrou_etapa_em: "2026-01-01T00:00:00Z", perdido: false },
    ];
    expect(contarCardsParados(cards, etapas, agora)).toBe(1);
  });
});

describe("janelaDeHoje", () => {
  it("usa o dia de Brasília, não o do servidor", () => {
    // 01h UTC do dia 16 = 22h do dia 15 em Brasília
    const j = janelaDeHoje(new Date("2026-10-16T01:00:00Z"));
    expect(j.data).toBe("2026-10-15");
    expect(j.inicio).toBe("2026-10-15T03:00:00.000Z");
    expect(j.fim).toBe("2026-10-16T03:00:00.000Z");
  });
});
