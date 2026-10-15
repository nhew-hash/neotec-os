import { describe, it, expect } from "vitest";
import { FILTROS_PADRAO, filtrarCards, resumoColuna } from "../crm-filtro";
import type { CardComRelacoes } from "@/services/crm-pipeline/crm-pipeline.service";

const agora = new Date("2026-10-15T15:00:00Z");
const card = (id: string, extra: Partial<CardComRelacoes>): CardComRelacoes => ({
  id, loja_id: "l", cliente_id: "c", etapa_id: "e1", titulo: "iPhone 15", valor_estimado: 1000, responsavel_id: null, origem: "instagram",
  entrou_etapa_em: "2026-10-14T15:00:00Z", score: 0, objecao: null, resumo_ia: null, proxima_acao: null, status_recuperacao: "ativo",
  sequencia_followup: 0, ultima_resposta_cliente_em: null, perdido: false, motivo_perda: null, convertido_em_os_id: null,
  created_at: "", updated_at: "", cliente: { id: "c", nome: "Mariana Souza", whatsapp: "34999990001", temperatura: "quente" },
  tags: [], conversa: null, responsavel: null, ...extra,
} as CardComRelacoes);
const etapas = [{ id: "e1", dias_para_alerta: 3 }];

describe("filtrarCards", () => {
  const cards = [
    card("a", {}),
    card("b", { perdido: true }),
    card("c", { responsavel_id: "eu", entrou_etapa_em: "2026-10-01T00:00:00Z" }),
    card("d", { origem: "google", cliente: { id: "x", nome: "Carlos Lima", whatsapp: "34999990002", temperatura: "frio" } }),
  ];
  it("esconde perdidas por padrão", () => {
    expect(filtrarCards(cards, etapas, FILTROS_PADRAO, "eu", agora).map((c) => c.id)).toEqual(["a", "c", "d"]);
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, mostrarPerdidas: true }, "eu", agora)).toHaveLength(4);
  });
  it("minhas, paradas, origem, temperatura", () => {
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, somenteMinhas: true }, "eu", agora).map((c) => c.id)).toEqual(["c"]);
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, somenteParadas: true }, "eu", agora).map((c) => c.id)).toEqual(["c"]);
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, origem: "google" }, "eu", agora).map((c) => c.id)).toEqual(["d"]);
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, temperatura: "frio" }, "eu", agora).map((c) => c.id)).toEqual(["d"]);
  });
  it("busca por nome sem acento e por telefone", () => {
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, busca: "carlos" }, "eu", agora).map((c) => c.id)).toEqual(["d"]);
    expect(filtrarCards(cards, etapas, { ...FILTROS_PADRAO, busca: "(34) 99999-0002" }, "eu", agora).map((c) => c.id)).toEqual(["d"]);
  });
  it("resumo da coluna soma o valor estimado", () => {
    expect(resumoColuna(cards.slice(0, 2))).toEqual({ quantidade: 2, valor: 2000 });
  });
});
