import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { cargoPermitido } from "../exigir-cargo";

describe("cargoPermitido", () => {
  it("aceita só cargos da lista", () => {
    expect(cargoPermitido("admin", ["admin"])).toBe(true);
    expect(cargoPermitido("gerente", ["admin", "gerente"])).toBe(true);
    expect(cargoPermitido("vendedor", ["admin", "gerente"])).toBe(false);
  });
  it("nega cargo vazio ou indefinido", () => {
    expect(cargoPermitido(undefined, ["admin"])).toBe(false);
    expect(cargoPermitido(null, ["admin"])).toBe(false);
    expect(cargoPermitido("", ["admin"])).toBe(false);
  });
});
