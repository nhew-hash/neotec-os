import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verificarAssinaturaMeta, segredoConfere } from "../webhook-assinatura";

const corpo = JSON.stringify({ entry: [] });
const assinar = (segredo: string) => "sha256=" + createHmac("sha256", segredo).update(corpo).digest("hex");

describe("verificarAssinaturaMeta", () => {
  it("aceita a assinatura correta", () => {
    expect(verificarAssinaturaMeta({ corpo, assinatura: assinar("s3gredo"), segredo: "s3gredo" })).toEqual({ valida: true });
  });
  it("recusa assinatura de outro segredo ou de outro corpo", () => {
    expect(verificarAssinaturaMeta({ corpo, assinatura: assinar("outro"), segredo: "s3gredo" }).valida).toBe(false);
    expect(verificarAssinaturaMeta({ corpo: corpo + " ", assinatura: assinar("s3gredo"), segredo: "s3gredo" }).valida).toBe(false);
  });
  it("recusa POST sem cabeçalho de assinatura", () => {
    expect(verificarAssinaturaMeta({ corpo, assinatura: null, segredo: "s3gredo" })).toEqual({ valida: false, motivo: "assinatura_ausente" });
  });
  it("é fail-closed sem segredo configurado (antes aceitava qualquer corpo)", () => {
    expect(verificarAssinaturaMeta({ corpo, assinatura: null, segredo: undefined })).toEqual({ valida: false, motivo: "segredo_ausente" });
  });
  it("só libera sem segredo com opt-in explícito e fora de produção", () => {
    expect(verificarAssinaturaMeta({ corpo, assinatura: null, segredo: undefined, permitirSemAssinatura: true, producao: false }).valida).toBe(true);
    expect(verificarAssinaturaMeta({ corpo, assinatura: null, segredo: undefined, permitirSemAssinatura: true, producao: true }).valida).toBe(false);
  });
});

describe("segredoConfere", () => {
  it("compara em tempo constante e recusa vazio", () => {
    expect(segredoConfere("abc", "abc")).toBe(true);
    expect(segredoConfere("abd", "abc")).toBe(false);
    expect(segredoConfere("abc", undefined)).toBe(false);
    expect(segredoConfere(null, "abc")).toBe(false);
    expect(segredoConfere("", "")).toBe(false);
  });
});
