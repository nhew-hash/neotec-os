import "server-only";
import { buscarItemParaProposta } from "./central-comercial.service";
import { obterClienteBasico } from "./clientes-busca.service";
import { contextoDaConversa, obterPropostaParaRetomar } from "./propostas.service";
import type { LinhaUI, PropostaInicial } from "@/components/central-comercial/proposta-form";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParametrosProposta = {
  retomar?: string;
  conversa?: string;
  cliente?: string;
  modo?: string;
  itens: { tipo: "aparelho" | "produto" | "lacrado"; id: string }[];
  nota: string;
};

/**
 * Dados iniciais da proposta (retomar, a partir da conversa, do cliente ou de
 * itens do catálogo/atendimento). Usado pela página da proposta e pela
 * proposta aberta dentro da conversa — mesma regra nos dois lugares.
 */
export async function montarPropostaInicial(params: ParametrosProposta, auth: { userId: string; cargo: string }): Promise<{ inicial: PropostaInicial; erro: string | null }> {
  const { retomar, conversa, itens: itensParam, nota } = params;
  const clienteParam = params.cliente;
  const modoParam = params.modo;
  const vazio: PropostaInicial = { orcamentoId: null, cliente: null, itens: [], desconto: "", tradeInId: null, modo: modoParam === "whatsapp" ? "whatsapp" : "presencial", conversaId: null, naoContatar: false, observacoes: "", aviso: null };
  let inicial: PropostaInicial = vazio;
  let erro: string | null = null;

  try {
    if (retomar && uuid.test(retomar)) {
      const p = await obterPropostaParaRetomar(retomar, auth.userId, auth.cargo);
      const cliente = await obterClienteBasico(p.clienteId);
      const resolvidos = await Promise.allSettled(p.itens.map((i) => buscarItemParaProposta(i.tipo, i.id)));
      const itens: LinhaUI[] = p.itens.map((i, idx) => {
        const r = resolvidos[idx];
        return r.status === "fulfilled"
          ? { tipo: i.tipo, id: i.id, rotulo: r.value.descricao, preco: r.value.preco, quantidade: i.quantidade }
          : { tipo: i.tipo, id: i.id, rotulo: "Item", preco: 0, quantidade: i.quantidade, indisponivel: true };
      });
      const algumIndisponivel = itens.some((i) => i.indisponivel);
      inicial = {
        orcamentoId: p.orcamentoId, cliente: cliente ?? { id: p.clienteId, nome: p.clienteNome, whatsapp: p.clienteWhatsapp ?? "", cidade: null, clienteDesde: null, orcamentosAbertos: 0 },
        itens, desconto: p.desconto > 0 ? String(p.desconto).replace(".", ",") : "", tradeInId: p.tradeInId, modo: p.modo,
        conversaId: p.conversaId, naoContatar: false, observacoes: p.observacoes ?? "",
        aviso: algumIndisponivel ? "Algum item desta proposta não está mais disponível. Remova-o e atualize. Os valores foram recalculados com os preços de hoje." : "Valores recalculados com os preços de hoje.",
      };
    } else if (conversa && uuid.test(conversa)) {
      const ctx = await contextoDaConversa(conversa);
      if (!ctx) erro = "Não encontrei essa conversa, ou ela ainda não está ligada a um cliente cadastrado. Busque o cliente abaixo.";
      else {
        const cliente = await obterClienteBasico(ctx.clienteId);
        inicial = { ...vazio, cliente, modo: "whatsapp", conversaId: ctx.conversaId, naoContatar: ctx.naoContatar };
      }
    } else if (clienteParam && uuid.test(clienteParam)) {
      inicial = { ...vazio, cliente: await obterClienteBasico(clienteParam) };
    }
    if (!inicial.orcamentoId && itensParam.length > 0) {
      const resolvidos = await Promise.allSettled(itensParam.map((i) => buscarItemParaProposta(i.tipo, i.id)));
      const itens: LinhaUI[] = itensParam.flatMap((i, idx) => {
        const r = resolvidos[idx];
        return r.status === "fulfilled" ? [{ tipo: i.tipo, id: i.id, rotulo: r.value.descricao, preco: r.value.preco, quantidade: 1 }] : [];
      });
      const fora = itensParam.length - itens.length;
      inicial = { ...inicial, itens, observacoes: inicial.observacoes || nota, aviso: fora > 0 ? `${fora} ${fora === 1 ? "item do catálogo não está mais disponível e ficou" : "itens do catálogo não estão mais disponíveis e ficaram"} de fora.` : inicial.aviso };
    }
    if (!inicial.orcamentoId && nota && !inicial.observacoes) inicial = { ...inicial, observacoes: nota };
  } catch (e) {
    erro = e instanceof Error ? e.message : "Não foi possível abrir a proposta.";
  }
  return { inicial, erro };
}
