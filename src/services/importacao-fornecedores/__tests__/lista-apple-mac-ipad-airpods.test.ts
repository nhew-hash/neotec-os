import { describe, it, expect } from "vitest";
import { classificarMensagem } from "../classificador";
import { processarMensagemFornecedor } from "../orquestrador";
import {
  FIXTURE_2_REALEZA_APPLE_LACRADOS_V1,
  FIXTURE_3_REALEZA_APPLE_LACRADOS_V2,
  FIXTURE_6_REALEZA_JBL_EXTRAS,
  FIXTURE_8_REALEZA_APPLE_SEMINOVOS,
} from "../__fixtures__/mensagens-reais";

/**
 * Auditoria 2026-10: a Realeza mandou uma lista nova só com Mac/AirPods/iPad.
 * Antes ela caía em "tipo_desconhecido" e não era cadastrada (sem aviso).
 * As listas abaixo são EXEMPLOS no formato da Realeza (a mensagem real não
 * estava disponível nesta sessão) — o que se testa é a regra de classificação.
 */
const SO_AIRPODS = "AIRPODS LACRADOS\nAirpods 4 🤍 899\nAirpods 4 ANC 🤍 1099\nAirpods Pro 2 🤍 1450";
const MAC_MINI_IMAC = "Mac mini M4 16/256 3999\nMac mini M4 Pro 24/512 7999\niMac 24 M4 16/256 🩵 9499";
const IPAD_PENCIL = "iPad 11 128gb 🩶 2399\niPad Air M3 128gb 💜 4199\nApple Pencil Pro 799";
/** Formato real da Realeza: um modelo por bloco, separado por linha em branco. */
const LISTA_FORMATO_REALEZA = `🎧AirPods lacrados🎧

🎧 Airpods Pro 2 🤍 1450

🎧Airpods 4 ANC
✅Branco 💰1.099 R$

💻 Mac mini M4 16/256 3999

💻 Mac mini M4 Pro 24/512 7999

💻 iMac 24 M4 (16/256) 🔵💚 9499

📲iPad Air M3 (128 GB)
✅💜 💰4.199 R$

✏️ Apple Pencil Pro 799`;
const MACBOOK_AIRPODS = "Macbook Air M4 13 16/256 6999\nAirpods Pro 2 1450";

describe("lista Apple sem iPhone (Mac/iPad/AirPods) — tipo próprio", () => {
  it.each([
    ["só AirPods", SO_AIRPODS],
    ["Mac mini / iMac", MAC_MINI_IMAC],
    ["iPad + Pencil", IPAD_PENCIL],
    ["MacBook + AirPods", MACBOOK_AIRPODS],
  ])("%s é reconhecida (antes: tipo_desconhecido ou misturada com iPhones)", (_n, texto) => {
    expect(classificarMensagem(texto, "realeza")).toEqual({ classificacao: "lista", tipoLista: "apple_mac_ipad_airpods" });
  });

  it("listas reais de Apple lacrados (com iPhone) continuam no escopo de sempre", () => {
    expect(classificarMensagem(FIXTURE_2_REALEZA_APPLE_LACRADOS_V1, "realeza").tipoLista).toBe("apple_lacrados");
    expect(classificarMensagem(FIXTURE_3_REALEZA_APPLE_LACRADOS_V2, "realeza").tipoLista).toBe("apple_lacrados");
  });

  it("não rouba seminovos nem JBL/extras", () => {
    expect(classificarMensagem(FIXTURE_8_REALEZA_APPLE_SEMINOVOS, "realeza").tipoLista).toBe("apple_seminovos");
    expect(classificarMensagem(FIXTURE_6_REALEZA_JBL_EXTRAS, "realeza").tipoLista).toBe("audio_extras");
  });

  it("itens saem com o escopo novo, lacrados e na categoria certa", () => {
    const r = processarMensagemFornecedor(LISTA_FORMATO_REALEZA, "realeza");
    expect(r.tipoLista).toBe("apple_mac_ipad_airpods");
    const itens = r.resultado?.itens ?? [];
    expect(itens.length).toBeGreaterThan(0);
    for (const i of itens) {
      expect(i.tipoLista).toBe("apple_mac_ipad_airpods");
      expect(i.condicao).toBe("Lacrado");
      expect(i.marca).toBe("Apple");
    }
    const porModelo = (re: RegExp) => itens.find((i) => re.test(i.modeloCanonico));
    expect(porModelo(/AirPods Pro 2/)?.categoriaSlug).toBe("acessorios_apple");
    expect(porModelo(/Mac Mini/)?.categoriaSlug).toBe("computadores_macbook");
    // preço vem da lista, não do número do modelo ("AirPods 4" não é R$ 4)
    expect(porModelo(/AirPods Pro 2/)?.precoFornecedor).toBe(1450);
    expect(porModelo(/iPad Air/)?.precoFornecedor).toBe(4199);
    // Mac é RAM/SSD: "16/256" = 256 GB
    expect(porModelo(/Mac Mini M4$/)?.armazenamentoGb).toBe(256);
    expect(porModelo(/Mac Mini M4 Pro/)?.armazenamentoGb).toBe(512);
    expect(porModelo(/iMac/)?.categoriaSlug).toBe("computadores_macbook");
    expect(porModelo(/iPad Air/)?.categoriaSlug).toBe("tablets_ipad");
  });
});
