import { createAdminClient } from "@/lib/supabase/admin";
import { buscarPrioridadeBuscaPreco } from "@/services/cotacoes/cotacoes-config.service";

/**
 * Service Role Key em todo o arquivo — as duas funções aqui rodam
 * dentro do processamento de webhook (IA de Atendimento respondendo
 * cliente), sem sessão de usuário nenhuma. Com o client de sessão, a
 * RLS não achava nada, a busca de preço sempre voltava vazia, e a IA
 * nunca encontrava preço nenhum (mesmo bug da Fase 37/38, encontrado
 * aqui também em teste).
 */

export interface ResultadoBuscaPreco {
  fonte: "estoque" | "seminovos" | "lacrados" | "fornecedores";
  modelo: string;
  detalhes: string;
  preco: number;
  fornecedorOuOrigem: string;
  dataReferencia: string;
}

async function buscarNoEstoque(termo: string): Promise<ResultadoBuscaPreco[]> {
  const supabase = createAdminClient();
  // Tabela base, não a view mascarada — só selecionamos preco_venda
  // (nunca custo), então a máscara de custo não tem relevância aqui, e
  // views não carregam metadado de FK pro PostgREST fazer o join.
  const { data } = await supabase
    .from("aparelhos")
    .select("imei, preco_venda, status, produto:produtos!inner(nome)")
    .eq("status", "disponivel")
    .ilike("produto.nome", `%${termo}%`)
    .limit(5);

  return (data ?? [])
    .filter((a) => a.preco_venda != null)
    .map((a) => ({
      fonte: "estoque" as const,
      modelo: (a.produto as unknown as { nome: string })?.nome ?? termo,
      detalhes: `IMEI ${a.imei}`,
      preco: Number(a.preco_venda),
      fornecedorOuOrigem: "Estoque da loja",
      dataReferencia: "hoje",
    }));
}

async function buscarEmCotacoes(termo: string, filtroCategoria: (categoria: string) => boolean, fonte: "seminovos" | "lacrados" | "fornecedores"): Promise<ResultadoBuscaPreco[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cotacao_itens")
    .select("modelo, armazenamento, cor, bateria_percentual, preco, cotacao:cotacoes!inner(fornecedor, categoria, data_cotacao, status)")
    .eq("cotacao.status", "ativa")
    .ilike("modelo", `%${termo}%`)
    .order("preco", { ascending: true })
    .limit(10);

  return (data ?? [])
    .filter((item) => filtroCategoria((item.cotacao as unknown as { categoria: string }).categoria))
    .slice(0, 5)
    .map((item) => {
      const cotacao = item.cotacao as unknown as { fornecedor: string; data_cotacao: string };
      const detalhesPartes = [item.armazenamento, item.cor, item.bateria_percentual ? `${item.bateria_percentual}%` : null].filter(Boolean);
      return {
        fonte,
        modelo: item.modelo,
        detalhes: detalhesPartes.join(" · "),
        preco: Number(item.preco),
        fornecedorOuOrigem: cotacao.fornecedor,
        dataReferencia: cotacao.data_cotacao,
      };
    });
}

const BUSCADORES: Record<string, (termo: string) => Promise<ResultadoBuscaPreco[]>> = {
  estoque: buscarNoEstoque,
  seminovos: (termo) => buscarEmCotacoes(termo, (c) => c.toLowerCase().includes("seminovo"), "seminovos"),
  lacrados: (termo) => buscarEmCotacoes(termo, (c) => c.toLowerCase().includes("lacrado"), "lacrados"),
  fornecedores: (termo) => buscarEmCotacoes(termo, (c) => !c.toLowerCase().includes("seminovo") && !c.toLowerCase().includes("lacrado"), "fornecedores"),
};

/**
 * Busca preço na ordem configurada em Configurações → Cotações. Para na
 * PRIMEIRA fonte que trouxer resultado — não soma nem mistura fontes
 * diferentes numa resposta só, pra não confundir o cliente com preços
 * de origens diferentes ao mesmo tempo.
 */
export async function buscarPrecoParaAtendimento(termo: string): Promise<ResultadoBuscaPreco[]> {
  const prioridade = await buscarPrioridadeBuscaPreco();
  const ordem = prioridade?.ordem ?? ["estoque", "seminovos", "lacrados", "fornecedores"];

  for (const fonte of ordem) {
    const buscador = BUSCADORES[fonte];
    if (!buscador) continue;
    const resultados = await buscador(termo);
    if (resultados.length > 0) return resultados;
  }

  return [];
}
