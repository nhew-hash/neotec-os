import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enviarEventoMetaCapi } from "../meta-capi.service";

/**
 * Fase 262 — testes da lógica pura do CAPI que NÃO depende de bater
 * de verdade na Graph API: (1) nunca envia nada sem Pixel ID + token
 * configurados; (2) nunca envia nada de verdade fora de produção, a
 * menos que META_CAPI_FORCE_DEV force isso; (3) nunca lança erro pra
 * quem chamou, mesmo quando a Meta responde com falha — um evento de
 * marketing não pode derrubar uma venda.
 */
describe("meta-capi.service", () => {
  const ambienteOriginal = { ...process.env };
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    process.env = { ...ambienteOriginal };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = { ...ambienteOriginal };
    global.fetch = fetchOriginal;
    vi.unstubAllEnvs();
  });

  const eventoBase = {
    eventName: "Purchase" as const,
    eventId: "pagamento-123",
    eventSourceUrl: "https://neotecbrasil.com/loja/checkout",
    userData: { telefone: "34999999999" },
    customData: { value: 100, currency: "BRL" },
  };

  it("não envia nada e avisa o motivo quando não há Pixel ID/token configurados", async () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.META_DATASET_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;

    const resultado = await enviarEventoMetaCapi(eventoBase);

    expect(resultado.enviado).toBe(false);
    expect(resultado.motivo).toMatch(/não configurado/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("não envia de verdade fora de produção, mesmo configurado", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123";
    process.env.META_CAPI_ACCESS_TOKEN = "token-fake";
    delete process.env.META_CAPI_FORCE_DEV;

    const resultado = await enviarEventoMetaCapi(eventoBase);

    expect(resultado.enviado).toBe(false);
    expect(resultado.motivo).toMatch(/development/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("envia de verdade em development quando META_CAPI_FORCE_DEV=true", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123";
    process.env.META_CAPI_ACCESS_TOKEN = "token-fake";
    process.env.META_CAPI_FORCE_DEV = "true";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, text: async () => "" });

    const resultado = await enviarEventoMetaCapi(eventoBase);

    expect(resultado.enviado).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("/123/events");
    const corpo = JSON.parse((init as RequestInit).body as string);
    expect(corpo.data[0].event_id).toBe("pagamento-123");
    expect(corpo.data[0].event_name).toBe("Purchase");
    // Telefone precisa ir hasheado (sha256), nunca em texto puro.
    expect(corpo.data[0].user_data.ph[0]).not.toBe("34999999999");
    expect(corpo.data[0].user_data.ph[0]).toHaveLength(64);
  });

  it("nunca lança erro quando a Meta responde com falha — só reporta enviado:false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123";
    process.env.META_CAPI_ACCESS_TOKEN = "token-fake";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 400, text: async () => "erro simulado" });

    const resultado = await enviarEventoMetaCapi(eventoBase);

    expect(resultado.enviado).toBe(false);
  });

  it("nunca lança erro quando o fetch rejeita (rede fora, etc)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "123";
    process.env.META_CAPI_ACCESS_TOKEN = "token-fake";
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));

    await expect(enviarEventoMetaCapi(eventoBase)).resolves.toMatchObject({ enviado: false });
  });
});
