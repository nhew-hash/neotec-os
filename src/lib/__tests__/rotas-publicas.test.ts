import { describe, it, expect } from "vitest";
import { isRotaPublica } from "../rotas-publicas";

describe("isRotaPublica", () => {
  it("vitrine e suas APIs são públicas (antes /api/loja ia para o login)", () => {
    expect(isRotaPublica("/loja")).toBe(true);
    expect(isRotaPublica("/loja/produto/iphone-13")).toBe(true);
    expect(isRotaPublica("/api/loja/busca")).toBe(true);
    expect(isRotaPublica("/api/loja/track")).toBe(true);
  });
  it("painéis internos com prefixo parecido NÃO são públicos", () => {
    expect(isRotaPublica("/loja-admin")).toBe(false);
    expect(isRotaPublica("/loja-admin/cupons")).toBe(false);
    expect(isRotaPublica("/achadinhos-admin")).toBe(false);
    expect(isRotaPublica("/portaria")).toBe(false);
  });
  it("áreas do sistema exigem login", () => {
    expect(isRotaPublica("/dashboard")).toBe(false);
    expect(isRotaPublica("/comunicacao/123")).toBe(false);
    expect(isRotaPublica("/api/whatsapp-midia")).toBe(false);
  });
  it("webhooks e achadinhos continuam públicos", () => {
    expect(isRotaPublica("/api/whatsapp/webhook")).toBe(true);
    expect(isRotaPublica("/achadinhos/fone-x")).toBe(true);
    expect(isRotaPublica("/api/achadinhos/v1/tools")).toBe(true);
    expect(isRotaPublica("/")).toBe(true);
  });
});
