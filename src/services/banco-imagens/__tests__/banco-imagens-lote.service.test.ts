import { describe, it, expect } from "vitest";
import { upsertGrupoPorOrigemId } from "../banco-imagens-lote.service";
import type { GrupoLoteValues } from "../banco-imagens.schema";

/** Fila de respostas — cada chamada consome a próxima, na ordem em que `upsertGrupoPorOrigemId` de fato dispara (mesma estratégia do teste de `importar-job.service`). */
function makeSupabaseMock(respostas: Array<{ data?: unknown; error?: unknown }>) {
  let i = 0;
  const proxima = () => (respostas[i] !== undefined ? respostas[i++] : { data: null, error: null });
  function builder(): any {
    const obj: any = {
      select: () => obj,
      update: () => obj,
      insert: () => obj,
      eq: () => obj,
      is: () => obj,
      maybeSingle: () => Promise.resolve(proxima()),
      single: () => Promise.resolve(proxima()),
      then: (resolve: (v: unknown) => void) => resolve(proxima()),
    };
    return obj;
  }
  return { from: () => builder() } as any;
}

const grupo: GrupoLoteValues = {
  origem_id: "IPHONE14PLUS-ROXO",
  categoria: "smartphone",
  marca: "Apple",
  modelo: "iPhone 14 Plus",
  cor: "Roxo",
  cores_equivalentes: [],
  modelos_equivalentes: [],
  classificacao: "catalogo",
  fonte_url: null,
  observacao: null,
  fotos: [],
};

describe("upsertGrupoPorOrigemId", () => {
  it("cria um grupo novo quando não existe nada com esse origem_id nem um antigo idêntico", async () => {
    const admin = makeSupabaseMock([
      { data: null, error: null }, // busca por origem_id -> não existe
      { data: null, error: null }, // busca de grupo antigo idêntico -> não existe
      { data: { id: "novo-id" }, error: null }, // insert
    ]);

    const resultado = await upsertGrupoPorOrigemId(admin, "loja-1", grupo);

    expect(resultado).toEqual({ id: "novo-id", acao: "criado" });
  });

  it("Fase 249: adota um grupo antigo idêntico (mesma marca/modelo/cor, sem origem_id) em vez de inserir e colidir com a constraint única", async () => {
    const admin = makeSupabaseMock([
      { data: null, error: null }, // busca por origem_id -> não existe ainda
      { data: { id: "antigo-existente" }, error: null }, // busca de grupo antigo idêntico -> ACHOU
      { data: null, error: null }, // update do grupo antigo adotado
    ]);

    const resultado = await upsertGrupoPorOrigemId(admin, "loja-1", grupo);

    expect(resultado).toEqual({ id: "antigo-existente", acao: "adotado" });
  });

  it("atualiza quando já existe um grupo com esse origem_id (reimportação idempotente)", async () => {
    const admin = makeSupabaseMock([
      { data: { id: "ja-existe" }, error: null }, // busca por origem_id -> já existe
      { data: null, error: null }, // update
    ]);

    const resultado = await upsertGrupoPorOrigemId(admin, "loja-1", grupo);

    expect(resultado).toEqual({ id: "ja-existe", acao: "atualizado" });
  });
});
