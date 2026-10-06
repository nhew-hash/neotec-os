import { describe, it, expect } from "vitest";
import { descreverLog, nomeDoAtor } from "../log-texto";

const base = { ator_tipo: "claude" as const, ator_nome: "Chave X", produto_nome: "Fone JBL", detalhe: null };

describe("descreverLog", () => {
  it("frases do briefing: 'Claude criou produto X', 'Usuário alterou produto Z'", () => {
    expect(descreverLog({ ...base, operacao: "create_product", resultado: "sucesso" })).toBe('Claude (Chave X) criou o produto "Fone JBL"');
    expect(descreverLog({ ...base, operacao: "pause_product", resultado: "sucesso" })).toBe('Claude (Chave X) pausou o produto "Fone JBL"');
    expect(descreverLog({ ...base, ator_tipo: "usuario", ator_nome: "Nhew", operacao: "update_product", resultado: "sucesso", detalhe: { campos: ["preco_atual", "categoria"] } }))
      .toBe('Nhew editou o produto "Fone JBL" (preço atual, categoria)');
  });
  it("negativas dizem o motivo", () => {
    expect(descreverLog({ ...base, operacao: "create_product", resultado: "negado", detalhe: { escopo_necessario: "escrita" } }))
      .toBe('Claude (Chave X) tentou criar o produto "Fone JBL", mas foi barrado (sem permissão para isso)');
    expect(descreverLog({ ...base, operacao: "delete_product", resultado: "negado", detalhe: { motivo: "confirmacao_ausente_ou_incorreta" } }))
      .toContain("faltou a confirmação");
  });
  it("erros mostram a mensagem", () => {
    expect(descreverLog({ ...base, produto_nome: null, operacao: "create_product", resultado: "erro", detalhe: { erro: "link_afiliado: inválido" } }))
      .toBe("Claude (Chave X) tentou criar, mas deu erro: link_afiliado: inválido");
  });
  it("operações sem produto e chaves de API", () => {
    expect(descreverLog({ ...base, produto_nome: null, operacao: "get_catalog_summary", resultado: "sucesso" })).toBe("Claude (Chave X) consultou o resumo do catálogo");
    expect(descreverLog({ ...base, ator_tipo: "usuario", ator_nome: "Nhew", produto_nome: null, operacao: "criar_chave_api", resultado: "sucesso", detalhe: { nome: "Claude Desktop" } }))
      .toBe('Nhew criou a chave de API "Claude Desktop"');
  });
  it("nome do ator", () => {
    expect(nomeDoAtor({ ator_tipo: "sistema", ator_nome: "x" })).toBe("Sistema");
    expect(nomeDoAtor({ ator_tipo: "usuario", ator_nome: "Nhew" })).toBe("Nhew");
  });
});
