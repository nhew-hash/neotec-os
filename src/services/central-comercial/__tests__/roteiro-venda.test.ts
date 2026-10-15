import { describe, it, expect } from "vitest";
import { NECESSIDADE_VAZIA, OBJECOES, fraseConfirmacao, mensagensAcompanhamento, recomendar, resumoNecessidade } from "../roteiro-venda";
import type { ItemCatalogo } from "../catalogo";

const it_ = (id: string, preco: number, extra: Partial<ItemCatalogo> = {}): ItemCatalogo => ({ tipo: "aparelho", id, nome: id, grupo: "iphone_seminovo", detalhes: [], preco, foto: null, bateria: null, vaiParaProposta: true, linkLoja: null, quantidade: 1, ...extra });

describe("roteiro do Manual de Vendas", () => {
  it("tem as 10 objeções do manual", () => expect(OBJECOES).toHaveLength(10));

  it("frase de confirmação só com o que foi respondido", () => {
    expect(fraseConfirmacao(NECESSIDADE_VAZIA)).toBeNull();
    expect(fraseConfirmacao({ ...NECESSIDADE_VAZIA, faltaNele: "mais bateria", orcamento: 3000, prioridades: ["camera", "espaco"] }))
      .toMatch(/^Então, pelo que entendi, você procura mais bateria, quer investir até R\$\s3\.000 e prioriza câmera e espaço\. Acertei\?$/);
  });

  it("sem orçamento não inventa indicação", () => {
    expect(recomendar([it_("a", 2000)], NECESSIDADE_VAZIA)).toEqual({ principal: null, alternativa: null });
  });

  it("principal dentro do orçamento e alternativa até 20% acima", () => {
    const r = recomendar([it_("barato", 1800), it_("bom", 2900), it_("acima", 3300), it_("muito", 4500)], { ...NECESSIDADE_VAZIA, orcamento: 3000 });
    expect(r.principal?.id).toBe("bom");
    expect(r.alternativa?.id).toBe("acima");
  });

  it("prioridade bateria desempata pela saúde da bateria", () => {
    const r = recomendar([it_("b79", 2900, { bateria: 79 }), it_("b95", 2850, { bateria: 95 })], { ...NECESSIDADE_VAZIA, orcamento: 3000, prioridades: ["bateria"] });
    expect(r.principal?.id).toBe("b95");
  });

  it("resumo interno e acompanhamento com o nome", () => {
    expect(resumoNecessidade({ ...NECESSIDADE_VAZIA, aparelhoAtual: "iPhone 11", troca: true, pagamento: "cartao" })).toBe("Usa hoje: iPhone 11 · Troca: sim · Pagamento: cartão");
    const m = mensagensAcompanhamento("Mariana Souza", "Júlia Peres");
    expect(m.map((x) => x.momento)).toEqual(["no_dia", "24h", "encerramento"]);
    expect(m[0].texto).toContain("Oi, Mariana! Aqui é a Júlia, da Neotec.");
  });
});
