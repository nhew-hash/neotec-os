import { describe, it, expect } from "vitest";
import { conversaParada, conversaPareceEncerrada, ehMensagemDeEncerramento } from "../encerramento";

describe("mensagem de encerramento", () => {
  it.each(["ok", "Ok!", "OK tranquilo", "beleza", "blz", "obg", "Obrigada!", "obrigado", "eu que agradeço", "até", "ook", "okkk", "Tá bom", "aa tá", "👍", "🙏🏾", "valeu 👍"])("encerra: %s", (t) => {
    expect(ehMensagemDeEncerramento(t)).toBe(true);
  });
  it.each(["certinho aguardo", "ook aguardo", "ok, e quanto fica?", "centro?", "onde vc está", "[audio]", "[imagem]", "minha tela tá pifando", "já tá fechada", "não deu certo", "ok mas quero ver outro", "", null])("não encerra: %s", (t) => {
    expect(ehMensagemDeEncerramento(t as string)).toBe(false);
  });
  it("só conta como encerrada se a loja respondeu antes", () => {
    expect(conversaPareceEncerrada({ texto: "ok", em: "2026-10-15T12:00:00Z" }, null)).toBe(false);
    expect(conversaPareceEncerrada({ texto: "ok", em: "2026-10-15T12:00:00Z" }, "2026-10-15T11:59:00Z")).toBe(true);
    expect(conversaPareceEncerrada({ texto: "quanto fica?", em: "2026-10-15T12:00:00Z" }, "2026-10-15T11:59:00Z")).toBe(false);
  });
});

describe("conversa parada", () => {
  const agora = new Date("2026-10-15T12:00:00Z");
  it("mais de 4 dias sem resposta sai da fila", () => {
    expect(conversaParada("2026-10-11T11:00:00Z", agora)).toBe(true);
    expect(conversaParada("2026-10-12T12:00:00Z", agora)).toBe(false);
    expect(conversaParada(null, agora)).toBe(false);
  });
});
