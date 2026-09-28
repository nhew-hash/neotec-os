import { describe, expect, it } from "vitest";
import { inicioDoDiaBrasilia, horaBrasilia, obterDataHoraBrasilia } from "../data-brasilia";

describe("data-brasilia (Fase 254 — corrige limites de dia calculados no fuso do servidor)", () => {
  it("calcula a hora local de Brasília a partir de um instante UTC (offset fixo -3)", () => {
    // 02:30 UTC = 23:30 do dia anterior em Brasília (UTC-3)
    expect(horaBrasilia(new Date("2026-05-10T02:30:00Z"))).toBe(23);
    // 03:00 UTC = 00:00 em Brasília — início do dia seguinte
    expect(horaBrasilia(new Date("2026-05-10T03:00:00Z"))).toBe(0);
    // 15:00 UTC = 12:00 em Brasília
    expect(horaBrasilia(new Date("2026-05-10T15:00:00Z"))).toBe(12);
  });

  it("resolve corretamente o dia de Brasília perto da virada UTC (o bug real do C4)", () => {
    // 01:00 UTC de 28/09 = 22:00 de 27/09 em Brasília — deveria contar como 27/09, não 28/09
    const { ano, mes, dia } = obterDataHoraBrasilia(new Date("2026-09-28T01:00:00Z"));
    expect(`${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`).toBe("2026-09-27");
  });

  it("inicioDoDiaBrasilia aponta pro instante UTC 03:00 do dia local correto", () => {
    const meiaNoite = inicioDoDiaBrasilia(new Date("2026-09-28T14:00:00Z")); // 11h da manhã em Brasília, dia 28
    expect(meiaNoite.toISOString()).toBe("2026-09-28T03:00:00.000Z");
  });

  it("inicioDoDiaBrasilia de um instante logo após meia-noite UTC ainda cai no dia anterior em Brasília", () => {
    // 01:00 UTC de 28/09 é 22:00 de 27/09 em Brasília — início do dia deve ser 27/09 03:00 UTC, não 28/09
    const meiaNoite = inicioDoDiaBrasilia(new Date("2026-09-28T01:00:00Z"));
    expect(meiaNoite.toISOString()).toBe("2026-09-27T03:00:00.000Z");
  });
});
