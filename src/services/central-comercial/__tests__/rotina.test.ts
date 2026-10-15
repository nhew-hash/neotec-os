import { describe, it, expect } from "vitest";
import { proximaAcao, type EntradaRotina } from "../rotina";

const vazio: EntradaRotina = { clientesAguardando: [], orcamentosParados: [], sugestoesPendentes: 0, tarefasAtrasadas: 0, tarefasPendentes: 0 };

describe("proximaAcao", () => {
  it("sem nada pendente, convida a fazer uma proposta", () => {
    const a = proximaAcao(vazio);
    expect(a.tipo).toBe("em_dia");
    expect(a.href).toBe("/central-comercial/proposta");
  });
  it("cliente esperando vem antes de qualquer outra coisa e abre a conversa certa", () => {
    const a = proximaAcao({ ...vazio, sugestoesPendentes: 5, tarefasAtrasadas: 2, clientesAguardando: [{ nome: "Ana", naoLidas: 2, conversaId: "c1" }, { nome: "Beto", naoLidas: 1, conversaId: "c2" }] });
    expect(a.tipo).toBe("responder");
    expect(a.href).toBe("/comunicacao/c1");
    expect(a.detalhe).toContain("1 cliente");
  });
  it("proposta parada: escolhe a mais antiga e ignora as recentes", () => {
    const a = proximaAcao({ ...vazio, orcamentosParados: [{ cliente: "Caio", dias: 1 }, { cliente: "Duda", dias: 6 }, { cliente: "Eli", dias: 4 }] });
    expect(a.tipo).toBe("orcamento_parado");
    expect(a.titulo).toContain("Duda");
    expect(a.detalhe).toContain("2 propostas paradas");
  });
  it("só propostas recentes não viram ação", () => {
    expect(proximaAcao({ ...vazio, orcamentosParados: [{ cliente: "Caio", dias: 2 }] }).tipo).toBe("em_dia");
  });
  it("ordem final: follow-up, tarefa atrasada, tarefa", () => {
    expect(proximaAcao({ ...vazio, sugestoesPendentes: 1, tarefasAtrasadas: 1 }).tipo).toBe("follow_up");
    expect(proximaAcao({ ...vazio, tarefasAtrasadas: 1, tarefasPendentes: 3 }).tipo).toBe("tarefa_atrasada");
    expect(proximaAcao({ ...vazio, tarefasPendentes: 3 }).tipo).toBe("tarefa");
  });
});
