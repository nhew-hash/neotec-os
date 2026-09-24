import { describe, it, expect } from "vitest";
import { mesclarGruposAntigos } from "../banco-imagens.service";

/**
 * Mock do query builder do Supabase pra `mesclarGruposAntigos`, roteado
 * por tabela: `banco_imagens_grupos` responde a `select`/`delete`, as
 * tabelas de vínculo (`produtos`/`aparelhos`/`catalogo_lacrados_variantes`)
 * respondem a `select(..., {count})` (dry run) e `update(...)` (aplicado),
 * ambas contando quantos vínculos o grupo antigo tinha.
 */
function makeSupabaseMock(grupos: unknown[], vinculosPorAntigoId: Record<string, number> = {}) {
  const deletados: string[] = [];
  const movidos: { tabela: string; antigoId: string; novoId: string }[] = [];

  function from(tabela: string) {
    if (tabela === "banco_imagens_grupos") {
      return {
        select: () => Promise.resolve({ data: grupos, error: null }),
        delete: () => ({
          eq: (_col: string, id: string) => {
            deletados.push(id);
            return Promise.resolve({ error: null });
          },
        }),
      };
    }
    return {
      select: () => ({
        eq: (_col: string, antigoId: string) => Promise.resolve({ count: vinculosPorAntigoId[`${tabela}:${antigoId}`] ?? 0, error: null }),
      }),
      update: (payload: { banco_imagens_grupo_id: string }) => ({
        eq: (_col: string, antigoId: string) => {
          movidos.push({ tabela, antigoId, novoId: payload.banco_imagens_grupo_id });
          return Promise.resolve({ count: vinculosPorAntigoId[`${tabela}:${antigoId}`] ?? 0, error: null });
        },
      }),
    };
  }

  return { supabase: { from } as any, deletados, movidos };
}

const GRUPO_ANTIGO_ESTELAR = { id: "antigo-1", marca: "Apple", modelo: "iPhone 13", cor: "Branco", origem_id: null, cores_equivalentes: [], modelos_equivalentes: [] };
const GRUPO_NOVO_ESTELAR = {
  id: "novo-1", marca: "Apple", modelo: "iPhone 13", cor: "Estelar", origem_id: "IPHONE13-ESTELAR",
  cores_equivalentes: ["Branco"], modelos_equivalentes: [],
};

describe("mesclarGruposAntigos", () => {
  it("mescla grupo antigo com cor equivalente ('Branco') no único grupo novo compatível ('Estelar'), movendo os vínculos e apagando o antigo", async () => {
    const { supabase, deletados, movidos } = makeSupabaseMock([GRUPO_ANTIGO_ESTELAR, GRUPO_NOVO_ESTELAR], {
      "produtos:antigo-1": 0,
      "aparelhos:antigo-1": 2,
      "catalogo_lacrados_variantes:antigo-1": 1,
    });

    const relatorio = await mesclarGruposAntigos(supabase, false);

    expect(relatorio.naoMesclados).toEqual([]);
    expect(relatorio.mesclados).toEqual([{ antigoId: "antigo-1", novoOrigemId: "IPHONE13-ESTELAR", vinculosMovidos: 3 }]);
    expect(deletados).toEqual(["antigo-1"]);
    expect(movidos.every((m) => m.antigoId === "antigo-1" && m.novoId === "novo-1")).toBe(true);
    expect(movidos.map((m) => m.tabela).sort()).toEqual(["aparelhos", "catalogo_lacrados_variantes", "produtos"]);
  });

  it("dry_run calcula os vínculos que SERIAM movidos sem apagar nem mover nada", async () => {
    const { supabase, deletados, movidos } = makeSupabaseMock([GRUPO_ANTIGO_ESTELAR, GRUPO_NOVO_ESTELAR], {
      "produtos:antigo-1": 0,
      "aparelhos:antigo-1": 2,
      "catalogo_lacrados_variantes:antigo-1": 1,
    });

    const relatorio = await mesclarGruposAntigos(supabase, true);

    expect(relatorio.mesclados).toEqual([{ antigoId: "antigo-1", novoOrigemId: "IPHONE13-ESTELAR", vinculosMovidos: 3 }]);
    expect(deletados).toEqual([]);
    expect(movidos).toEqual([]);
  });

  it("não mescla quando o grupo antigo bate com 2+ grupos novos (ambíguo) — fica em nao_mesclados", async () => {
    const grupoNovoA = { ...GRUPO_NOVO_ESTELAR, id: "novo-a", origem_id: "IPHONE13-ESTELAR-A" };
    const grupoNovoB = { id: "novo-b", marca: "Apple", modelo: "iPhone 13", cor: "Prata", origem_id: "IPHONE13-PRATA", cores_equivalentes: ["Branco"], modelos_equivalentes: [] };
    const { supabase, deletados, movidos } = makeSupabaseMock([GRUPO_ANTIGO_ESTELAR, grupoNovoA, grupoNovoB]);

    const relatorio = await mesclarGruposAntigos(supabase, false);

    expect(relatorio.mesclados).toEqual([]);
    expect(relatorio.naoMesclados).toEqual([
      { antigoId: "antigo-1", marca: "Apple", modelo: "iPhone 13", cor: "Branco", motivo: "ambiguo", candidatos: expect.arrayContaining(["IPHONE13-ESTELAR-A", "IPHONE13-PRATA"]) },
    ]);
    expect(deletados).toEqual([]);
    expect(movidos).toEqual([]);
  });

  it("não mescla quando nenhum grupo novo compatível existe — fica em nao_mesclados", async () => {
    const { supabase } = makeSupabaseMock([GRUPO_ANTIGO_ESTELAR]);

    const relatorio = await mesclarGruposAntigos(supabase, false);

    expect(relatorio.mesclados).toEqual([]);
    expect(relatorio.naoMesclados).toEqual([
      { antigoId: "antigo-1", marca: "Apple", modelo: "iPhone 13", cor: "Branco", motivo: "sem_grupo_novo_compativel", candidatos: [] },
    ]);
  });

  it("ignora grupo antigo sem cor (produto 'padrão' — não é o caso deste problema)", async () => {
    const antigoSemCor = { ...GRUPO_ANTIGO_ESTELAR, id: "antigo-2", cor: null };
    const { supabase } = makeSupabaseMock([antigoSemCor, GRUPO_NOVO_ESTELAR]);

    const relatorio = await mesclarGruposAntigos(supabase, false);

    expect(relatorio.mesclados).toEqual([]);
    expect(relatorio.naoMesclados).toEqual([]);
  });
});
