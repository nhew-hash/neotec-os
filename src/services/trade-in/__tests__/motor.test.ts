import { describe, expect, it } from "vitest";
import { avaliarTradeIn, type ConfigTradeIn, type ModeloTradeIn } from "../motor";

const config: ConfigTradeIn = { bateriaCorte: 80, bonusSeminovo: 100 };

const modelo: ModeloTradeIn = {
  id: "modelo-1",
  nome: "iPhone 13 128GB",
  valorTroca: 2000,
  avariasDisponiveis: [
    { codigo: "bateria", nome: "Bateria", desconto: 150, bloqueia: false },
    { codigo: "tela", nome: "Tela (touch/imagem)", desconto: 300, bloqueia: false },
    { codigo: "face_id", nome: "Face ID / Touch ID", desconto: 200, bloqueia: false },
    { codigo: "liquido", nome: "Sinais de líquido", desconto: 0, bloqueia: true },
    { codigo: "imei_bloqueado", nome: "IMEI bloqueado/restrito ou divergente", desconto: 0, bloqueia: true },
  ],
};

describe("avaliarTradeIn", () => {
  // Caso 1: aparelho com condição perfeita
  it("condição perfeita: valor final = valor base, sem ajustes", () => {
    const resultado = avaliarTradeIn(modelo, config, { avariasMarcadas: [], bateriaSaude: 90 });
    expect(resultado.valorBase).toBe(2000);
    expect(resultado.ajustes).toEqual([]);
    expect(resultado.totalDescontos).toBe(0);
    expect(resultado.bloqueado).toBe(false);
    expect(resultado.valorFinal).toBe(2000);
  });

  // Caso 2: bateria ruim (abaixo do corte, marcada automaticamente mesmo sem checklist)
  it("bateria abaixo do corte: marca avaria 'bateria' automaticamente e desconta", () => {
    const resultado = avaliarTradeIn(modelo, config, { avariasMarcadas: [], bateriaSaude: 75 });
    expect(resultado.ajustes).toEqual([{ codigo: "bateria", nome: "Bateria", desconto: 150 }]);
    expect(resultado.totalDescontos).toBe(150);
    expect(resultado.valorFinal).toBe(1850);
    expect(resultado.regrasAplicadas.some((r) => r.includes("automaticamente"))).toBe(true);
  });

  // Caso 3: tela danificada
  it("tela danificada: desconta o valor configurado para o modelo", () => {
    const resultado = avaliarTradeIn(modelo, config, { avariasMarcadas: ["tela"], bateriaSaude: 90 });
    expect(resultado.totalDescontos).toBe(300);
    expect(resultado.valorFinal).toBe(1700);
    expect(resultado.bloqueado).toBe(false);
  });

  // Caso 4: Face ID defeituoso
  it("Face ID defeituoso: desconta o valor configurado, sem bloquear", () => {
    const resultado = avaliarTradeIn(modelo, config, { avariasMarcadas: ["face_id"], bateriaSaude: 90 });
    expect(resultado.totalDescontos).toBe(200);
    expect(resultado.valorFinal).toBe(1800);
    expect(resultado.bloqueado).toBe(false);
  });

  // Caso 5: bloqueado por regra (líquido / IMEI)
  it("sinal de líquido bloqueia o trade-in inteiro (valor final = 0, sem somar outros descontos)", () => {
    const resultado = avaliarTradeIn(modelo, config, {
      avariasMarcadas: ["liquido", "tela"],
      bateriaSaude: 90,
    });
    expect(resultado.bloqueado).toBe(true);
    expect(resultado.motivos).toEqual(["Sinais de líquido"]);
    expect(resultado.valorFinal).toBe(0);
    // avaria bloqueante não entra na lista de ajustes/desconto somável
    expect(resultado.ajustes.find((a) => a.codigo === "liquido")).toBeUndefined();
  });

  it("IMEI bloqueado também bloqueia o trade-in", () => {
    const resultado = avaliarTradeIn(modelo, config, { avariasMarcadas: ["imei_bloqueado"], bateriaSaude: 90 });
    expect(resultado.bloqueado).toBe(true);
    expect(resultado.motivos).toEqual(["IMEI bloqueado/restrito ou divergente"]);
    expect(resultado.valorFinal).toBe(0);
  });

  // Caso 6: modelo sem valor cadastrado — responsabilidade da camada de
  // aplicação (não chamar o motor / retornar "avaliação manual necessária"
  // antes disso). Aqui garantimos que o motor não faz suposição: se
  // valorBaseManual não for passado, ele nunca inventa nada além do que
  // veio em `modelo.valorTroca` — cobrindo o contrato "não invente".
  it("nunca usa outro valor além do informado em valorTroca/valorBaseManual", () => {
    const modeloZerado: ModeloTradeIn = { ...modelo, valorTroca: 0 };
    const resultado = avaliarTradeIn(modeloZerado, config, { avariasMarcadas: [], bateriaSaude: 90 });
    expect(resultado.valorBase).toBe(0);
    expect(resultado.valorFinal).toBe(0);
  });

  // Caso 7: alteração manual do valor — o motor calcula `valorFinal`
  // (valor_calculado, nunca editado); a substituição por `valor_aprovado`
  // com motivo obrigatório acontece na camada de aplicação/UI, não aqui.
  // O que o motor garante é que `valorBaseManual` pode alimentar um
  // recálculo a partir de uma base diferente, sem afetar o restante da lógica.
  it("valorBaseManual substitui a base sem alterar o resto do cálculo", () => {
    const resultado = avaliarTradeIn(modelo, config, {
      avariasMarcadas: ["tela"],
      bateriaSaude: 90,
      valorBaseManual: 2500,
    });
    expect(resultado.valorBase).toBe(2500);
    expect(resultado.totalDescontos).toBe(300);
    expect(resultado.valorFinal).toBe(2200);
  });

  it("aplica o bônus de seminovo apenas quando solicitado", () => {
    const semBonus = avaliarTradeIn(modelo, config, { avariasMarcadas: [], bateriaSaude: 90 });
    const comBonus = avaliarTradeIn(modelo, config, {
      avariasMarcadas: [],
      bateriaSaude: 90,
      aplicarBonusSeminovo: true,
    });
    expect(semBonus.bonus).toBe(0);
    expect(comBonus.bonus).toBe(100);
    expect(comBonus.valorFinal).toBe(2100);
  });

  it("nunca deixa o valor final ficar negativo mesmo com descontos maiores que a base", () => {
    const modeloBarato: ModeloTradeIn = { ...modelo, valorTroca: 100 };
    const resultado = avaliarTradeIn(modeloBarato, config, {
      avariasMarcadas: ["tela", "face_id"],
      bateriaSaude: 90,
    });
    expect(resultado.totalDescontos).toBe(500);
    expect(resultado.valorFinal).toBe(0);
  });
});
