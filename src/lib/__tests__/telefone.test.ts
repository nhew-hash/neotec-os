import { describe, it, expect } from "vitest";
import { finalDoTelefone, formatarTelefone, interpretarBuscaCliente, normalizarTelefone, telefoneValido } from "../telefone";

describe("normalizarTelefone", () => {
  it("ignora espaços, parênteses e hífens", () => {
    expect(normalizarTelefone("(34) 99999-0000")).toBe("34999990000");
    expect(normalizarTelefone("34 99999 0000")).toBe("34999990000");
  });
  it("remove o 55 só quando sobra um número completo", () => {
    expect(normalizarTelefone("+55 34 99999-0000")).toBe("34999990000");
    expect(normalizarTelefone("553499990000")).toBe("3499990000");
    expect(normalizarTelefone("5599")).toBe("5599"); // DDD 55 + 2 dígitos: busca parcial, não mexe
  });
});

describe("telefoneValido", () => {
  it("aceita 10 e 11 dígitos com DDD plausível", () => {
    expect(telefoneValido("34999990000")).toBe(true);
    expect(telefoneValido("3499990000")).toBe(true);
    expect(telefoneValido("0199990000")).toBe(false);
    expect(telefoneValido("999990000")).toBe(false);
  });
});

describe("formatarTelefone", () => {
  it("formata completo e parcial", () => {
    expect(formatarTelefone("34999990000")).toBe("(34) 99999-0000");
    expect(formatarTelefone("3499990000")).toBe("(34) 9999-0000");
    expect(formatarTelefone("349")).toBe("(34) 9");
    expect(formatarTelefone("")).toBe("");
  });
});

describe("interpretarBuscaCliente", () => {
  it("34999990000 e (34) 99999-0000 viram a mesma busca", () => {
    expect(interpretarBuscaCliente("34999990000")).toEqual({ nomes: [], digitos: ["34999990000"] });
    expect(interpretarBuscaCliente("(34) 99999-0000")).toEqual({ nomes: [], digitos: ["34999990000"] });
  });
  it("aceita só o DDD e parte do número", () => {
    expect(interpretarBuscaCliente("34").digitos).toEqual(["34"]);
    expect(interpretarBuscaCliente("9999-00").digitos).toEqual(["999900"]);
  });
  it("nome e telefone ao mesmo tempo", () => {
    expect(interpretarBuscaCliente("ana 9999")).toEqual({ nomes: ["ana"], digitos: ["9999"] });
  });
  it("remove caracteres que quebrariam o filtro", () => {
    const r = interpretarBuscaCliente("jo,ão%_(x) o'brien");
    expect(r.nomes.join(" ")).not.toMatch(/[,%_()']/);
  });
  it("vazio não busca nada", () => {
    expect(interpretarBuscaCliente("   ")).toEqual({ nomes: [], digitos: [] });
  });
});

describe("finalDoTelefone", () => {
  it("compara pelos 8 últimos dígitos", () => {
    expect(finalDoTelefone("34999990000")).toBe("99990000");
    expect(finalDoTelefone("3499990000")).toBe("99990000");
  });
});
