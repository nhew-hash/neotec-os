import { describe, it, expect } from "vitest";
import { avaliarEnvioAutomatico, dentroDaJanelaDeEnvio, detectarPedidoNaoContato, janelaDoAmbiente } from "../trava-envio";

// Datas em UTC; Brasília = UTC-3.
const seg10h = new Date("2026-10-12T13:00:00Z"); // segunda 10h BRT
const seg20h = new Date("2026-10-12T23:00:00Z"); // segunda 20h BRT
const seg08h = new Date("2026-10-12T11:00:00Z"); // segunda 08h BRT
const sab15h = new Date("2026-10-17T18:00:00Z"); // sábado 15h BRT
const dom12h = new Date("2026-10-18T15:00:00Z"); // domingo 12h BRT
const seg01hUtcMasDomingoBrt = new Date("2026-10-19T01:00:00Z"); // domingo 22h BRT

describe("dentroDaJanelaDeEnvio", () => {
  it("aceita seg-sáb entre 09h e 19h de Brasília", () => {
    expect(dentroDaJanelaDeEnvio(seg10h)).toBe(true);
    expect(dentroDaJanelaDeEnvio(sab15h)).toBe(true);
  });
  it("bloqueia antes das 9h, a partir das 19h e domingo", () => {
    expect(dentroDaJanelaDeEnvio(seg08h)).toBe(false);
    expect(dentroDaJanelaDeEnvio(seg20h)).toBe(false);
    expect(dentroDaJanelaDeEnvio(dom12h)).toBe(false);
  });
  it("usa o dia de Brasília, não o UTC", () => {
    expect(dentroDaJanelaDeEnvio(seg01hUtcMasDomingoBrt)).toBe(false);
  });
  it("janela configurável por env", () => {
    const j = janelaDoAmbiente({ ENVIO_AUTO_HORA_INICIO: "8", ENVIO_AUTO_HORA_FIM: "21", ENVIO_AUTO_DOMINGO: "1" });
    expect(dentroDaJanelaDeEnvio(seg08h, j)).toBe(true);
    expect(dentroDaJanelaDeEnvio(dom12h, j)).toBe(true);
    expect(janelaDoAmbiente({ ENVIO_AUTO_HORA_INICIO: "abc" }).horaInicio).toBe(9);
  });
});

describe("detectarPedidoNaoContato", () => {
  it.each([
    "pare", "Pare por favor", "STOP", "não me mande mais mensagem", "Não quero mais receber mensagens",
    "me tira da lista", "para de me chamar", "não me incomode mais", "descadastrar", "não tenho interesse, pare de mandar mensagem",
    "Não quero receber contato",
  ])("detecta: %s", (texto) => expect(detectarPedidoNaoContato(texto)).toBe(true));

  it.each([
    "não quero o preto, quero o branco", "pare de dar desconto kkk não, brincadeira, quanto fica?", "parece bom, qual o valor?",
    "tenho interesse sim", "me manda o preço do iPhone 15", "não tenho interesse no 128, e o 256?", "", "oi", "quero parcelar",
  ])("não confunde: %s", (texto) => expect(detectarPedidoNaoContato(texto)).toBe(false));

  it("trata null/undefined", () => {
    expect(detectarPedidoNaoContato(null)).toBe(false);
    expect(detectarPedidoNaoContato(undefined)).toBe(false);
  });
});

describe("avaliarEnvioAutomatico", () => {
  it("bloqueia quem pediu para não ser contatado, mesmo em horário bom", () => {
    expect(avaliarEnvioAutomatico({ agora: seg10h, naoContatar: true })).toEqual({ permitido: false, motivo: "nao_contatar" });
  });
  it("bloqueia fora do horário", () => {
    expect(avaliarEnvioAutomatico({ agora: seg20h, naoContatar: false })).toEqual({ permitido: false, motivo: "fora_do_horario" });
  });
  it("bloqueia se já houve envio automático há menos de 24h", () => {
    const duasHorasAntes = new Date(seg10h.getTime() - 2 * 3_600_000).toISOString();
    expect(avaliarEnvioAutomatico({ agora: seg10h, naoContatar: false, ultimoEnvioAutomaticoEm: duasHorasAntes })).toEqual({ permitido: false, motivo: "intervalo_minimo" });
  });
  it("permite quando tudo está ok", () => {
    const ontem = new Date(seg10h.getTime() - 30 * 3_600_000).toISOString();
    expect(avaliarEnvioAutomatico({ agora: seg10h, naoContatar: false, ultimoEnvioAutomaticoEm: ontem })).toEqual({ permitido: true });
    expect(avaliarEnvioAutomatico({ agora: seg10h, naoContatar: false })).toEqual({ permitido: true });
  });
});
