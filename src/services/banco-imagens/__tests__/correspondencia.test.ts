import { describe, it, expect } from "vitest";
import { normalizar, modeloBate, corBate, marcaBate, resolverGrupo, type GrupoParaCorrespondencia } from "../correspondencia";

function grupo(parcial: Partial<GrupoParaCorrespondencia> & { id: string; modelo: string }): GrupoParaCorrespondencia {
  return { marca: "Apple", cor: null, modelosEquivalentes: [], coresEquivalentes: [], ...parcial };
}

describe("normalizar", () => {
  it("remove acento, baixa caixa, unifica hífen/espaço", () => {
    expect(normalizar("Titânio-preto")).toBe("titanio preto");
    expect(normalizar("Titânio   Preto")).toBe("titanio preto");
  });
  it("trata null/undefined como string vazia", () => {
    expect(normalizar(null)).toBe("");
    expect(normalizar(undefined)).toBe("");
  });
});

describe("modeloBate", () => {
  it("é exato — 'iPhone 14' não bate com 'iPhone 14 Pro Max'", () => {
    const g = grupo({ id: "g1", modelo: "iPhone 14 Pro Max" });
    expect(modeloBate("iPhone 14", g)).toBe(false);
    expect(modeloBate("iPhone 14 Pro Max", g)).toBe(true);
  });
  it("bate via modelos_equivalentes", () => {
    const g = grupo({ id: "g1", modelo: "Qaed Al Fursan Unlimited", modelosEquivalentes: ["Fursan Unlimited"] });
    expect(modeloBate("Fursan Unlimited", g)).toBe(true);
    expect(modeloBate("Qaed Al Fursan Unlimited", g)).toBe(true);
  });
  it("Fase 249: aceita uma lista de candidatos (nome E modelo do produto) — basta um bater", () => {
    const g = grupo({ id: "g1", modelo: "Yara Candy" });
    expect(modeloBate(["YARA CANDY", "PERF-YC-50"], g)).toBe(true);
    expect(modeloBate(["OUTRO NOME", "OUTRO CODIGO"], g)).toBe(false);
  });
  it("Fase 249: 'JBL Go4' bate com 'JBL Go 4' (espaço entre letra e dígito ignorado)", () => {
    const g = grupo({ id: "g1", modelo: "JBL Go 4" });
    expect(modeloBate("JBL Go4", g)).toBe(true);
  });
  it("Fase 249: 'KIT MANDARIN SKY 4PCS' bate com 'Kit Mandarin Sky 4pcs'", () => {
    const g = grupo({ id: "g1", modelo: "Kit Mandarin Sky 4pcs" });
    expect(modeloBate("KIT MANDARIN SKY 4PCS", g)).toBe(true);
  });
});

describe("corBate", () => {
  it("bate na cor oficial ou em cores_equivalentes", () => {
    const g = grupo({ id: "g1", modelo: "iPhone 14", cor: "Estelar", coresEquivalentes: ["Branco", "Branco/Prata", "Starlight"] });
    expect(corBate("Estelar", g)).toBe(true);
    expect(corBate("Branco", g)).toBe(true);
    expect(corBate("Preto", g)).toBe(false);
  });
});

describe("marcaBate", () => {
  it("Xiaomi bate com Redmi e POCO", () => {
    expect(marcaBate("Redmi", "Xiaomi")).toBe(true);
    expect(marcaBate("POCO", "Xiaomi")).toBe(true);
    expect(marcaBate("Samsung", "Xiaomi")).toBe(false);
  });
  it("item sem marca não bloqueia", () => {
    expect(marcaBate(null, "Apple")).toBe(true);
  });
  it("Fase 249: marca 'curinga' (placeholder) não bloqueia, de nenhum dos dois lados", () => {
    expect(marcaBate("Não informada", "Lattafa")).toBe(true);
    expect(marcaBate("Lattafa", "Não informada")).toBe(true);
    expect(marcaBate("Outra", "Xiaomi")).toBe(true);
    expect(marcaBate("Genérica", "Multilaser")).toBe(true);
    expect(marcaBate("", "Apple")).toBe(true);
  });
  it("Fase 249: marca real diferente ainda bloqueia mesmo com curingas por perto", () => {
    expect(marcaBate("Samsung", "Apple")).toBe(false);
  });
});

describe("resolverGrupo", () => {
  it("4 titânios do iPhone 15 Pro não colidem (cor oficial é a identidade do grupo)", () => {
    const grupos = [
      grupo({ id: "natural", modelo: "iPhone 15 Pro", cor: "Titânio Natural" }),
      grupo({ id: "preto", modelo: "iPhone 15 Pro", cor: "Titânio Preto" }),
      grupo({ id: "azul", modelo: "iPhone 15 Pro", cor: "Titânio Azul" }),
      grupo({ id: "branco", modelo: "iPhone 15 Pro", cor: "Titânio Branco" }),
    ];
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 15 Pro", cor: "Titânio Natural" }, grupos)).toEqual({ status: "vinculado", grupoId: "natural" });
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 15 Pro", cor: "Titânio Preto" }, grupos)).toEqual({ status: "vinculado", grupoId: "preto" });
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 15 Pro", cor: "Titânio Azul" }, grupos)).toEqual({ status: "vinculado", grupoId: "azul" });
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 15 Pro", cor: "Titânio Branco" }, grupos)).toEqual({ status: "vinculado", grupoId: "branco" });
  });

  it("'Branco/Prata' no iPhone 17 Pro casa com 'Prata' (única candidata)", () => {
    const grupos = [
      grupo({ id: "prata", modelo: "iPhone 17 Pro", cor: "Prata" }),
      grupo({ id: "azul", modelo: "iPhone 17 Pro", cor: "Azul-profundo", coresEquivalentes: ["Azul-intenso"] }),
    ];
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 17 Pro", cor: "Branco/Prata" }, grupos)).toEqual({ status: "vinculado", grupoId: "prata" });
  });

  it("'Cinza/Prata/Natural' no 16 Pro fica ambíguo entre Titânio-natural e Titânio-branco", () => {
    const grupos = [
      grupo({ id: "natural", modelo: "iPhone 16 Pro", cor: "Titânio Natural", coresEquivalentes: ["Natural"] }),
      grupo({ id: "branco", modelo: "iPhone 16 Pro", cor: "Titânio Branco", coresEquivalentes: ["Prata", "Cinza"] }),
      grupo({ id: "preto", modelo: "iPhone 16 Pro", cor: "Titânio Preto" }),
    ];
    const resultado = resolverGrupo({ marca: "Apple", modelo: "iPhone 16 Pro", cor: "Cinza/Prata/Natural" }, grupos);
    expect(resultado.status).toBe("ambiguo");
    if (resultado.status === "ambiguo") {
      expect(new Set(resultado.candidatos)).toEqual(new Set(["natural", "branco"]));
    }
  });

  it("'iPhone 14' não casa com grupo 'iPhone 14 Pro Max'", () => {
    const grupos = [grupo({ id: "g1", modelo: "iPhone 14 Pro Max", cor: "Preto" })];
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 14", cor: "Preto" }, grupos)).toEqual({ status: "sem_match" });
  });

  it("perfume sem cor casa por modelo equivalente", () => {
    const grupos = [
      grupo({
        id: "fursan", marca: "Genérico", modelo: "Qaed Al Fursan Unlimited", cor: null,
        modelosEquivalentes: ["Fursan Unlimited"],
      }),
    ];
    expect(resolverGrupo({ marca: null, modelo: "Fursan Unlimited", cor: null }, grupos)).toEqual({ status: "vinculado", grupoId: "fursan" });
  });

  it("nenhum grupo do modelo -> sem_match", () => {
    expect(resolverGrupo({ marca: "Apple", modelo: "iPhone 99", cor: "Preto" }, [])).toEqual({ status: "sem_match" });
  });

  it("cor simples batendo em 2+ grupos do mesmo modelo -> ambíguo", () => {
    const grupos = [
      grupo({ id: "g1", modelo: "iPhone X", cor: "Preto" }),
      grupo({ id: "g2", modelo: "iPhone X", cor: "Grafite", coresEquivalentes: ["Preto"] }),
    ];
    const resultado = resolverGrupo({ marca: "Apple", modelo: "iPhone X", cor: "Preto" }, grupos);
    expect(resultado.status).toBe("ambiguo");
  });

  it("item com cor mas modelo só tem grupo(s) sem cor -> sem_match (não força vínculo errado)", () => {
    const grupos = [grupo({ id: "g1", modelo: "Notebook X", cor: null })];
    expect(resolverGrupo({ marca: "Genérico", modelo: "Notebook X", cor: "Preto" }, grupos)).toEqual({ status: "sem_match" });
  });

  it("Fase 249: produto 'YARA CANDY' (marca 'Não informada', sem modelo) casa com grupo 'Yara Candy'/Lattafa via nome", () => {
    const grupos = [grupo({ id: "yara", marca: "Lattafa", modelo: "Yara Candy", cor: null })];
    expect(resolverGrupo({ marca: "Não informada", modelo: ["YARA CANDY", "YARA CANDY"], cor: null }, grupos)).toEqual({ status: "vinculado", grupoId: "yara" });
  });

  it("Fase 249: 'FURSAN UNLIMITED' casa com modelo equivalente mesmo com marca curinga", () => {
    const grupos = [
      grupo({ id: "fursan", marca: "Genérica", modelo: "Qaed Al Fursan Unlimited", cor: null, modelosEquivalentes: ["Fursan Unlimited"] }),
    ];
    expect(resolverGrupo({ marca: "Não informada", modelo: "FURSAN UNLIMITED", cor: null }, grupos)).toEqual({ status: "vinculado", grupoId: "fursan" });
  });

  it("Fase 249: lacrado 'Redmi 15C' com marca 'Outra' casa com grupo Xiaomi 'Redmi 15C'", () => {
    const grupos = [grupo({ id: "redmi15c", marca: "Xiaomi", modelo: "Redmi 15C", cor: "Azul" })];
    expect(resolverGrupo({ marca: "Outra", modelo: "Redmi 15C", cor: "Azul" }, grupos)).toEqual({ status: "vinculado", grupoId: "redmi15c" });
  });
});
