import { describe, it, expect } from "vitest";
import { calcularProgressoMeta, dataRefBrasilia, diasParado, gerarTarefasDoDia, resumoPorResponsavel, situacaoDaTarefa, type ModeloChecklist } from "../regras";

const modelo = (extra: Partial<ModeloChecklist> = {}): ModeloChecklist => ({
  id: "m1", loja_id: "L", titulo: "Abrir a loja", descricao: null, cargo: "vendedor", frequencia: "diaria", dia_semana: null, dia_mes: null, prazo_hora: "10:00", ativo: true, ...extra,
});
const usuarios = [
  { id: "u1", cargo: "vendedor", loja_id: "L" }, { id: "u2", cargo: "vendedor", loja_id: "L" },
  { id: "g1", cargo: "gerente", loja_id: "L" }, { id: "x1", cargo: "vendedor", loja_id: "OUTRA" },
];
const SEG = new Date("2026-10-12T13:00:00Z"); // segunda 10h Brasília

describe("gerarTarefasDoDia", () => {
  it("gera uma tarefa por usuário do cargo e da loja, com prazo em Brasília", () => {
    const t = gerarTarefasDoDia([modelo()], usuarios, SEG);
    expect(t.map((x) => x.responsavel_id).sort()).toEqual(["u1", "u2"]);
    expect(t[0].data_ref).toBe("2026-10-12");
    expect(t[0].prazo).toBe("2026-10-12T13:00:00.000Z"); // 10:00 BRT
  });
  it("modelo inativo não gera", () => {
    expect(gerarTarefasDoDia([modelo({ ativo: false })], usuarios, SEG)).toHaveLength(0);
  });
  it("semanal só no dia certo (segunda = 1)", () => {
    expect(gerarTarefasDoDia([modelo({ frequencia: "semanal", dia_semana: 1 })], usuarios, SEG)).toHaveLength(2);
    expect(gerarTarefasDoDia([modelo({ frequencia: "semanal", dia_semana: 2 })], usuarios, SEG)).toHaveLength(0);
  });
  it("mensal no dia pedido; dia 31 em mês curto vale no último dia", () => {
    expect(gerarTarefasDoDia([modelo({ frequencia: "mensal", dia_mes: 12 })], usuarios, SEG)).toHaveLength(2);
    expect(gerarTarefasDoDia([modelo({ frequencia: "mensal", dia_mes: 13 })], usuarios, SEG)).toHaveLength(0);
    const fimAbril = new Date("2026-04-30T15:00:00Z");
    expect(gerarTarefasDoDia([modelo({ frequencia: "mensal", dia_mes: 31 })], usuarios, fimAbril)).toHaveLength(2);
  });
  it("usa o dia de Brasília (01h UTC ainda é o dia anterior)", () => {
    expect(dataRefBrasilia(new Date("2026-10-13T01:00:00Z"))).toBe("2026-10-12");
  });
  it("modelo sem usuários do cargo não gera nada", () => {
    expect(gerarTarefasDoDia([modelo({ cargo: "tecnico" })], usuarios, SEG)).toHaveLength(0);
  });
});

describe("situação e resumo de tarefas", () => {
  const agora = new Date("2026-10-12T20:00:00Z");
  it("atrasada só se pendente e vencida", () => {
    expect(situacaoDaTarefa({ status: "pendente", prazo: "2026-10-12T13:00:00Z", responsavel_id: "u1" }, agora)).toBe("atrasada");
    expect(situacaoDaTarefa({ status: "pendente", prazo: "2026-10-12T21:00:00Z", responsavel_id: "u1" }, agora)).toBe("no_prazo");
    expect(situacaoDaTarefa({ status: "concluida", prazo: "2026-10-12T13:00:00Z", responsavel_id: "u1" }, agora)).toBe("concluida");
  });
  it("resumo ignora dispensadas", () => {
    const r = resumoPorResponsavel([
      { status: "concluida", prazo: "2026-10-12T13:00:00Z", responsavel_id: "u1" },
      { status: "pendente", prazo: "2026-10-12T13:00:00Z", responsavel_id: "u1" },
      { status: "dispensada", prazo: "2026-10-12T13:00:00Z", responsavel_id: "u1" },
    ], agora);
    expect(r.get("u1")).toEqual({ concluidas: 1, atrasadas: 1, noPrazo: 0, total: 2 });
  });
});

describe("calcularProgressoMeta", () => {
  it("sem meta cadastrada não inventa percentual", () => {
    const p = calcularProgressoMeta(null, 5000, SEG);
    expect(p.meta).toBeNull();
    expect(p.percentual).toBeNull();
    expect(p.faltam).toBeNull();
    expect(p.realizado).toBe(5000);
  });
  it("calcula percentual, falta e ritmo diário", () => {
    const p = calcularProgressoMeta(10000, 2500, new Date("2026-10-21T15:00:00Z")); // dia 21: restam 11 dias contando hoje
    expect(p.percentual).toBe(25);
    expect(p.faltam).toBe(7500);
    expect(p.diasRestantes).toBe(11);
    expect(p.porDiaRestante).toBe(681.82);
  });
  it("meta batida: nada falta", () => {
    const p = calcularProgressoMeta(1000, 1500, SEG);
    expect(p.faltam).toBe(0);
    expect(p.porDiaRestante).toBeNull();
  });
});

describe("diasParado", () => {
  it("conta dias inteiros", () => {
    expect(diasParado("2026-10-09T13:00:00Z", SEG)).toBe(3);
  });
});
