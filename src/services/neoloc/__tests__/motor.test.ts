import { describe, it, expect } from "vitest";
import { decidirAcaoAutomatica, gerarCommandId } from "../motor";

const CONFIG = { diasCobranca: 5, diasRecolhimento: 4 };

describe("decidirAcaoAutomatica", () => {
  it("não decide nada para dispositivo ainda não matriculado", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 20, statusMdmAtual: "nao_matriculado", existeComandoDeBloqueioPendenteOuRecente: false, contratoQuitado: false, liberacaoAutomaticaQuitacao: false },
      CONFIG
    );
    expect(decisao.tipo).toBe("nenhuma");
  });

  it("não bloqueia enquanto o atraso está dentro do limite configurado", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 5, statusMdmAtual: "matriculado", existeComandoDeBloqueioPendenteOuRecente: false, contratoQuitado: false, liberacaoAutomaticaQuitacao: false },
      CONFIG
    );
    expect(decisao.tipo).toBe("nenhuma");
  });

  it("bloqueia quando o atraso ultrapassa o limite configurado", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 6, statusMdmAtual: "matriculado", existeComandoDeBloqueioPendenteOuRecente: false, contratoQuitado: false, liberacaoAutomaticaQuitacao: false },
      CONFIG
    );
    expect(decisao.tipo).toBe("bloquear");
  });

  it("não gera um segundo comando de bloqueio se já existe um pendente/recente", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 10, statusMdmAtual: "matriculado", existeComandoDeBloqueioPendenteOuRecente: true, contratoQuitado: false, liberacaoAutomaticaQuitacao: false },
      CONFIG
    );
    expect(decisao.tipo).toBe("nenhuma");
  });

  it("desbloqueia quando o atraso zera e havia um bloqueio em vigor", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 0, statusMdmAtual: "matriculado", existeComandoDeBloqueioPendenteOuRecente: true, contratoQuitado: false, liberacaoAutomaticaQuitacao: false },
      CONFIG
    );
    expect(decisao.tipo).toBe("desbloquear");
  });

  it("não decide nada ao quitar quando a liberação automática está desligada (padrão: exige confirmação do administrador)", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 0, statusMdmAtual: "matriculado", existeComandoDeBloqueioPendenteOuRecente: false, contratoQuitado: true, liberacaoAutomaticaQuitacao: false },
      CONFIG
    );
    expect(decisao.tipo).toBe("nenhuma");
  });

  it("remove o MDM automaticamente ao quitar quando a loja configurou liberação automática", () => {
    const decisao = decidirAcaoAutomatica(
      { diasAtraso: 0, statusMdmAtual: "matriculado", existeComandoDeBloqueioPendenteOuRecente: false, contratoQuitado: true, liberacaoAutomaticaQuitacao: true },
      CONFIG
    );
    expect(decisao.tipo).toBe("remover_mdm");
  });
});

describe("gerarCommandId", () => {
  it("gera o mesmo command_id para o mesmo dispositivo/tipo/dia (idempotência)", () => {
    const data = new Date("2026-09-24T10:00:00Z");
    const id1 = gerarCommandId("disp-1", "bloquear", data);
    const id2 = gerarCommandId("disp-1", "bloquear", new Date("2026-09-24T22:00:00Z"));
    expect(id1).toBe(id2);
  });

  it("gera command_id diferente em dias diferentes", () => {
    const id1 = gerarCommandId("disp-1", "bloquear", new Date("2026-09-24T10:00:00Z"));
    const id2 = gerarCommandId("disp-1", "bloquear", new Date("2026-09-25T10:00:00Z"));
    expect(id1).not.toBe(id2);
  });

  it("gera command_id diferente para tipos diferentes", () => {
    const data = new Date("2026-09-24T10:00:00Z");
    expect(gerarCommandId("disp-1", "bloquear", data)).not.toBe(gerarCommandId("disp-1", "desbloquear", data));
  });
});
