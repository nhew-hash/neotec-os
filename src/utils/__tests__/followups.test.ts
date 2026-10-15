import { describe, it, expect } from "vitest";
import { categorizarFollowups } from "../followups";

const base = { card_id: null, cliente_id: "c", usuario_id: null, status: "pendente" as const, created_at: "", card: null, cliente: { id: "c", nome: "Ana" } };

describe("categorizarFollowups (fuso de Brasília)", () => {
  it("às 22h de Brasília (01h UTC do dia seguinte), um follow-up das 10h de hoje é 'hoje', não 'atrasado' do dia anterior", () => {
    const agora = new Date("2026-10-16T01:00:00Z"); // 15/10 22h BRT
    const itens = categorizarFollowups([
      { ...base, id: "1", motivo: "a", data_agendada: "2026-10-15T13:00:00Z" }, // 15/10 10h BRT
      { ...base, id: "2", motivo: "b", data_agendada: "2026-10-14T13:00:00Z" }, // 14/10
      { ...base, id: "3", motivo: "c", data_agendada: "2026-10-16T13:00:00Z" }, // 16/10
    ], agora);
    expect(itens.find((i) => i.id === "1")?.categoria).toBe("hoje");
    expect(itens.find((i) => i.id === "2")?.categoria).toBe("atrasado");
    expect(itens.find((i) => i.id === "3")?.categoria).toBe("futuro");
  });
});
