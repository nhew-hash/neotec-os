import { describe, it, expect } from "vitest";
import { filtrarConversas, nomeDaConversa } from "../conversas-filtro";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const base = { loja_id: "l", card_id: null, jid_envio: null, primeira_resposta_em: null, created_at: "", updated_at: "", ultima_mensagem_em: null };
const conversas = [
  { ...base, id: "1", cliente_id: "c1", cliente: { id: "c1", nome: "Mariana Souza" }, telefone: "5534999990001", ia_pausada: true, status: "aberta", responsavel_id: "eu", nao_lidas: 2 },
  { ...base, id: "2", cliente_id: "c2", cliente: { id: "c2", nome: "Carlos Lima" }, telefone: "553499990002", ia_pausada: false, status: "aberta", responsavel_id: null, nao_lidas: 0 },
  { ...base, id: "3", cliente_id: null, cliente: null, telefone: "5534988887777", ia_pausada: false, status: "resolvida", responsavel_id: null, nao_lidas: 0 },
] as ConversaComCliente[];

describe("filtrarConversas", () => {
  it("busca por nome NÃO devolve todas (bug anterior: telefone.includes(\"\") era sempre true)", () => {
    expect(filtrarConversas(conversas, "todos", "mari", "eu").map((c) => c.id)).toEqual(["1"]);
  });
  it("busca sem acento e por telefone mascarado", () => {
    expect(filtrarConversas(conversas, "todos", "LIMA", "eu").map((c) => c.id)).toEqual(["2"]);
    expect(filtrarConversas(conversas, "todos", "(34) 98888-7777", "eu").map((c) => c.id)).toEqual(["3"]);
  });
  it("número com 9º dígito acha conversa que veio sem ele (casa pelos 8 finais)", () => {
    expect(filtrarConversas(conversas, "todos", "34 99999-0002", "eu").map((c) => c.id)).toEqual(["2"]);
  });
  it("filtros de atendimento", () => {
    expect(filtrarConversas(conversas, "nao_lidas", "", "eu").map((c) => c.id)).toEqual(["1"]);
    expect(filtrarConversas(conversas, "minhas", "", "eu").map((c) => c.id)).toEqual(["1"]);
    expect(filtrarConversas(conversas, "sem_responsavel", "", "eu").map((c) => c.id)).toEqual(["2"]);
    expect(filtrarConversas(conversas, "ia_pausada", "", "eu").map((c) => c.id)).toEqual(["1"]);
    expect(filtrarConversas(conversas, "sem_cadastro", "", "eu").map((c) => c.id)).toEqual(["3"]);
  });
  it("nome de exibição sem cadastro é o telefone formatado sem 55", () => {
    expect(nomeDaConversa(conversas[2])).toBe("(34) 98888-7777");
  });
});
