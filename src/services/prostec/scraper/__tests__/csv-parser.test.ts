import { describe, it, expect } from "vitest";
import { parseCsvScraper } from "../csv-parser";

describe("parseCsvScraper", () => {
  it("faz parse das colunas padrão do gosom", () => {
    const csv = [
      "title,category,phone,website,emails,review_rating,review_count,place_id,cid,link,business_status",
      'Padaria do João,Padaria,(34) 99999-8888,https://padaria.com,"contato@padaria.com,vendas@padaria.com",4.5,120,ChIJabc123,123456,https://maps.google.com/x,OPERATIONAL',
    ].join("\n");

    const leads = parseCsvScraper(csv);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      titulo: "Padaria do João",
      categoria: "Padaria",
      telefone: "(34) 99999-8888",
      website: "https://padaria.com",
      emails: ["contato@padaria.com", "vendas@padaria.com"],
      nota: 4.5,
      totalAvaliacoes: 120,
      placeId: "ChIJabc123",
      cid: "123456",
      status: "OPERATIONAL",
    });
  });

  it("aceita nomes de coluna alternativos (aliases)", () => {
    const csv = ["titulo,categoria,telefone,site", "Oficina Central,Oficina,3432221234,oficina.com.br"].join("\n");
    const leads = parseCsvScraper(csv);
    expect(leads[0].titulo).toBe("Oficina Central");
    expect(leads[0].website).toBe("oficina.com.br");
  });

  it("lida com campos entre aspas contendo vírgula e quebra de linha", () => {
    const csv = [
      "title,complete_address",
      '"Restaurante, Bar e Petiscaria","Rua A, 123\nCentro"',
    ].join("\n");
    const leads = parseCsvScraper(csv);
    expect(leads[0].titulo).toBe("Restaurante, Bar e Petiscaria");
    expect(leads[0].endereco).toBe("Rua A, 123\nCentro");
  });

  it("ignora linhas sem título", () => {
    const csv = ["title,phone", ",34999998888", "Empresa Válida,34999997777"].join("\n");
    const leads = parseCsvScraper(csv);
    expect(leads).toHaveLength(1);
    expect(leads[0].titulo).toBe("Empresa Válida");
  });

  it("retorna vazio pra CSV vazio", () => {
    expect(parseCsvScraper("")).toEqual([]);
  });

  it("converte números com vírgula decimal", () => {
    const csv = ["title,review_rating", 'Loja X,"4,8"'].join("\n");
    const leads = parseCsvScraper(csv);
    expect(leads[0].nota).toBe(4.8);
  });
});
