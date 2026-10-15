import { describe, it, expect } from "vitest";
import { proximoStatusEntrega, statusMetaParaEntrega } from "../entrega-status";

describe("statusMetaParaEntrega", () => {
  it("traduz os status da Meta", () => {
    expect(statusMetaParaEntrega("sent")).toBe("enviado");
    expect(statusMetaParaEntrega("delivered")).toBe("entregue");
    expect(statusMetaParaEntrega("read")).toBe("lido");
    expect(statusMetaParaEntrega("failed")).toBe("erro");
    expect(statusMetaParaEntrega("deleted")).toBeNull();
  });
});

describe("proximoStatusEntrega", () => {
  it("só avança", () => {
    expect(proximoStatusEntrega("enviado", "entregue")).toBe("entregue");
    expect(proximoStatusEntrega("entregue", "lido")).toBe("lido");
  });
  it("não regride quando a Meta entrega fora de ordem", () => {
    expect(proximoStatusEntrega("lido", "entregue")).toBeNull();
    expect(proximoStatusEntrega("entregue", "enviado")).toBeNull();
  });
  it("falha vence e é terminal", () => {
    expect(proximoStatusEntrega("enviado", "erro")).toBe("erro");
    expect(proximoStatusEntrega("erro", "lido")).toBeNull();
  });
});
