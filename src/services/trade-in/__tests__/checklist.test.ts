import { describe, expect, it } from "vitest";
import { avariasDoChecklist, OPCOES_TAMPA_TRASEIRA } from "../checklist";

describe("avariasDoChecklist", () => {
  it("converte respostas 'reprovado' nos códigos de avaria correspondentes", () => {
    expect(avariasDoChecklist({ tela_estado: "reprovado", face_id: "ok" })).toEqual(["tela"]);
  });

  it("ignora itens 'ok' e desconhecidos", () => {
    expect(avariasDoChecklist({ tela_estado: "ok", item_que_nao_existe: "reprovado" } as any)).toEqual([]);
  });

  it("um item pode marcar mais de um código (ex: riscos_carcaca)", () => {
    const codigos = avariasDoChecklist({ riscos_carcaca: "reprovado" });
    expect(new Set(codigos)).toEqual(new Set(["marcas_leves", "marcas_moderadas"]));
  });
});

// Fase 250 — "estado da tampa traseira": 4 opções mutuamente excludentes,
// pergunta própria fora do checklist OK/Reprovado.
describe("OPCOES_TAMPA_TRASEIRA", () => {
  it("tem exatamente 4 opções: sem danos, marcas leves, marcas fortes, quebrada", () => {
    expect(OPCOES_TAMPA_TRASEIRA.map((o) => o.id)).toEqual(["sem_danos", "marcas_leves", "marcas_fortes", "quebrada"]);
  });

  it("'sem danos' não marca nenhuma avaria", () => {
    expect(OPCOES_TAMPA_TRASEIRA.find((o) => o.id === "sem_danos")?.avariaCodigo).toBeNull();
  });

  it("as outras 3 opções marcam um código de avaria distinto cada uma", () => {
    const codigos = OPCOES_TAMPA_TRASEIRA.filter((o) => o.id !== "sem_danos").map((o) => o.avariaCodigo);
    expect(codigos).toEqual(["traseira_marcas_leves", "traseira_marcas_fortes", "traseira"]);
    expect(new Set(codigos).size).toBe(3);
  });
});
