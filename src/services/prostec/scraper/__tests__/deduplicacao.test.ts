import { describe, it, expect } from "vitest";
import { encontrarDuplicata, type EmpresaExistenteParaDedupe, type LeadNormalizadoParaDedupe } from "../deduplicacao";

const candidatos: EmpresaExistenteParaDedupe[] = [
  { id: "1", name: "Padaria do João", city: "Araguari", telefone_e164: "+5534999998888", website: "https://padaria.com", gmaps_place_id: "ChIJabc" },
  { id: "2", name: "Oficina Central", city: "Araguari", telefone_e164: null, website: "https://oficinacentral.com.br", gmaps_place_id: null },
  { id: "3", name: "Salão da Maria", city: "Araguari", telefone_e164: null, website: null, gmaps_place_id: null },
];

function lead(overrides: Partial<LeadNormalizadoParaDedupe>): LeadNormalizadoParaDedupe {
  return { nome: "Empresa Nova", cidade: "Araguari", telefoneE164: null, website: null, gmapsPlaceId: null, ...overrides };
}

describe("encontrarDuplicata", () => {
  it("detecta duplicata pelo gmaps_place_id", () => {
    const resultado = encontrarDuplicata(lead({ nome: "Outro nome", gmapsPlaceId: "ChIJabc" }), candidatos);
    expect(resultado?.id).toBe("1");
  });

  it("detecta duplicata pelo telefone E.164", () => {
    const resultado = encontrarDuplicata(lead({ nome: "Outro nome", telefoneE164: "+5534999998888" }), candidatos);
    expect(resultado?.id).toBe("1");
  });

  it("detecta duplicata pelo domínio do site (ignora www e path)", () => {
    const resultado = encontrarDuplicata(lead({ nome: "Outro nome", website: "https://www.oficinacentral.com.br/contato" }), candidatos);
    expect(resultado?.id).toBe("2");
  });

  it("detecta duplicata por nome+cidade (case/acento insensível)", () => {
    const resultado = encontrarDuplicata(lead({ nome: "SALAO DA MARIA", cidade: "araguari" }), candidatos);
    expect(resultado?.id).toBe("3");
  });

  it("retorna null quando nenhum critério bate", () => {
    const resultado = encontrarDuplicata(lead({ nome: "Empresa Totalmente Nova", cidade: "Araguari" }), candidatos);
    expect(resultado).toBeNull();
  });

  it("não confunde empresas de cidades diferentes pelo nome", () => {
    const resultado = encontrarDuplicata(lead({ nome: "Salão da Maria", cidade: "Uberlândia" }), candidatos);
    expect(resultado).toBeNull();
  });
});
