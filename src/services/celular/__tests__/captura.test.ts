import { describe, expect, it } from "vitest";
import { caminhoFotoValido, rotaDoContexto } from "../captura";

const ID = "1c599e75-9170-4ace-b5c3-bdbd80482cbb";

describe("captura pelo celular", () => {
  it("aceita foto só na pasta do registro", () => {
    expect(caminhoFotoValido(`os/${ID}/lx1abc-0a1b2c3d4e5f.jpg`, "os", ID)).toBe(true);
    expect(caminhoFotoValido(`trade_in/${ID}/lx1abc-0a1b2c3d4e5f.jpg`, "os", ID)).toBe(false);
    expect(caminhoFotoValido(`os/${ID}/../outro/lx1abc.jpg`, "os", ID)).toBe(false);
    expect(caminhoFotoValido(`os/${ID}/sub/lx1abc-0a1b2c.jpg`, "os", ID)).toBe(false);
    expect(caminhoFotoValido(`os/${ID}/lx1abc-0a1b2c.exe`, "os", ID)).toBe(false);
  });
  it("volta para a tela certa", () => {
    expect(rotaDoContexto("os", ID)).toBe(`/assistencia/${ID}`);
    expect(rotaDoContexto("trade_in", ID)).toBe(`/trade-in/${ID}`);
    expect(rotaDoContexto("aparelho", ID)).toBe(`/estoque/aparelhos/${ID}`);
  });
});
