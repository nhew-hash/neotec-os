import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { categoriaDoModeloLacrado } from "../lacrado-encomenda.service";

describe("lacrado sob encomenda", () => {
  it("categoria do produto pelo nome do modelo", () => {
    expect(categoriaDoModeloLacrado("iPhone 17 Pro Max")).toBe("iphone");
    expect(categoriaDoModeloLacrado("iPad 11")).toBe("ipad");
    expect(categoriaDoModeloLacrado("Apple Watch Series 11")).toBe("apple_watch");
    expect(categoriaDoModeloLacrado("MacBook Neo")).toBe("notebook");
    expect(categoriaDoModeloLacrado("Redmi Note 15 Pro")).toBe("smartphone");
  });
});
