import { describe, it, expect } from "vitest";
import { cronAutorizado } from "../cron-auth";

describe("cronAutorizado", () => {
  it("nega quando o segredo não está configurado (falha fechada)", () => {
    expect(cronAutorizado(undefined, null)).toBe(false);
    expect(cronAutorizado("", "Bearer ")).toBe(false);
    expect(cronAutorizado(undefined, "Bearer qualquer")).toBe(false);
  });

  it("nega header ausente, errado ou de tamanho diferente", () => {
    expect(cronAutorizado("abc", null)).toBe(false);
    expect(cronAutorizado("abc", "Bearer abd")).toBe(false);
    expect(cronAutorizado("abc", "Bearer abcd")).toBe(false);
    expect(cronAutorizado("abc", "abc")).toBe(false);
  });

  it("aceita o Bearer correto", () => {
    expect(cronAutorizado("abc", "Bearer abc")).toBe(true);
  });
});
