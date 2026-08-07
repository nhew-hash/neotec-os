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
  /** Parcelamento calculado pelo mesmo motor de preço já usado no site — só preenchido pra fonte "estoque"/"lacrados" (preço real cadastrado, cotação de fornecedor não tem esse cálculo). */
  parcelamento: string | null;
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
      parcelamento: null,
    }));
}

/**
 * Catálogo mestre de lacrados (Fase 66-67) — essa fonte não existia
 * quando a busca de preço da IA foi escrita originalmente, e nunca
 * tinha sido conectada aqui até agora. Sem isso, toda pergunta sobre
 * preço de lacrado batia em "não encontrei preço" e escalava pro
 * vendedor sem necessidade — o dado já existia, só não estava sendo
 * consultado.
 */
async function buscarEmLacrados(termo: string): Promise<ResultadoBuscaPreco[]> {
  const supabase = createAdminClient();
  const { data: modelos } = await supabase
    .from("catalogo_lacrados_modelos")
    .select("id, nome")
    .ilike("nome", `%${termo}%`)
    .limit(3);

  if (!modelos || modelos.length === 0) return [];

  const { data: variantes } = await supabase
    .from("catalogo_lacrados_variantes")
    .select("cor, armazenamento, preco_venda, quantidade, modelo_id")
    .in("modelo_id", modelos.map((m) => m.id))
    .gt("quantidade", 0)
    .not("preco_venda", "is", null)
    .order("preco_venda", { ascending: true })
    .limit(5);

  return (variantes ?? []).map((v) => {
    const modelo = modelos.find((m) => m.id === v.modelo_id);
    return {
      fonte: "lacrados" as const,
      modelo: modelo?.nome ?? termo,
      detalhes: [v.armazenamento, v.cor, "lacrado"].filter(Boolean).join(" · "),
      preco: Number(v.preco_venda),
      fornecedorOuOrigem: "Catálogo de lacrados",
      dataReferencia: "hoje",
      parcelamento: null,
    };
  });
}

/**
 * Produtos genéricos (iPad, Mac, Apple Watch, acessórios) — mesma
 * lacuna do catálogo de lacrados: existe desde a Fase 83 (Central de
 * Cadastro por Fornecedor), nunca tinha sido conectado à busca da IA.
 */
async function buscarEmProdutosGenericos(termo: string): Promise<ResultadoBuscaPreco[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("produtos")
    .select("nome, categoria, preco_venda")
    .not("categoria", "in", "(iphone,android)")
    .ilike("nome", `%${termo}%`)
    .not("preco_venda", "is", null)
    .eq("status", "ativo")
    .limit(5);

  return (data ?? []).map((p) => ({
    fonte: "estoque" as const,
    modelo: p.nome,
    detalhes: p.categoria,
    preco: Number(p.preco_venda),
    fornecedorOuOrigem: "Estoque da loja",
    dataReferencia: "hoje",
    parcelamento: null,
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
        parcelamento: null,
      };
    });
}

const BUSCADORES: Record<string, (termo: string) => Promise<ResultadoBuscaPreco[]>> = {
  estoque: async (termo) => {
    const [aparelhos, genericos] = await Promise.all([buscarNoEstoque(termo), buscarEmProdutosGenericos(termo)]);
    return [...aparelhos, ...genericos];
  },
  lacrados: async (termo) => {
    const [catalogoMestre, cotacoesAntigas] = await Promise.all([
      buscarEmLacrados(termo),
      buscarEmCotacoes(termo, (c) => c.toLowerCase().includes("lacrado"), "lacrados"),
    ]);
    return [...catalogoMestre, ...cotacoesAntigas];
  },
  seminovos: (termo) => buscarEmCotacoes(termo, (c) => c.toLowerCase().includes("seminovo"), "seminovos"),
  fornecedores: (termo) => buscarEmCotacoes(termo, (c) => !c.toLowerCase().includes("seminovo") && !c.toLowerCase().includes("lacrado"), "fornecedores"),
};

/**
 * Busca preço na ordem configurada em Configurações → Cotações. Para na
 * PRIMEIRA fonte que trouxer resultado — não soma nem mistura fontes
 * diferentes numa resposta só, pra não confundir o cliente com preços
 * de origens diferentes ao mesmo tempo.
 *
 * Estratégia progressiva: tenta o termo completo primeiro, mas se o
 * cliente usou palavra a mais que não faz parte do nome do produto
 * (ex: "iphone 13 cor preta" quando o produto se chama só "iPhone 13"),
 * o "%termo completo%" nunca bate. Reduz uma palavra do final por vez
 * até achar algo — sem isso, qualquer detalhe extra na frase do
 * cliente derrubava a busca inteira e escalava pro vendedor à toa.
 */
export async function buscarPrecoParaAtendimento(termo: string): Promise<ResultadoBuscaPreco[]> {
  const prioridade = await buscarPrioridadeBuscaPreco();
  const ordem = prioridade?.ordem ?? ["estoque", "seminovos", "lacrados", "fornecedores"];

  const palavras = termo.split(/\s+/).filter(Boolean);
  // Tenta do termo mais completo (mais preciso) até o mais curto (mais
  // abrangente) — nunca menos de 1 palavra, pra não virar busca vazia.
  for (let tamanho = palavras.length; tamanho >= 1; tamanho--) {
    const termoTentativa = palavras.slice(0, tamanho).join(" ");
    for (const fonte of ordem) {
      const buscador = BUSCADORES[fonte];
      if (!buscador) continue;
      const resultados = await buscador(termoTentativa);
      if (resultados.length > 0) return enriquecerComParcelamento(resultados);
    }
  }

  // Último recurso — a ordem das palavras do cliente pode não ajudar
  // (ex: "tem o preto do 13?" em vez de "13 preto") — tenta a palavra
  // que contém número, que costuma ser o modelo, isolada.
  const palavraComNumero = palavras.find((p) => /\d/.test(p));
  if (palavraComNumero) {
    for (const fonte of ordem) {
      const buscador = BUSCADORES[fonte];
      if (!buscador) continue;
      const resultados = await buscador(palavraComNumero);
      if (resultados.length > 0) return enriquecerComParcelamento(resultados);
    }
  }

  return [];
}

/**
 * Calcula parcelamento pelo mesmo motor de preço já usado no site
 * (Pricing Engine) — a Iara passa a citar "em até Nx de RX" com dado
 * real, não só o valor à vista. Só faz sentido pra preço cadastrado de
 * verdade (estoque/lacrado), não pra cotação de fornecedor (ainda não
 * é preço de venda formado).
 */
async function enriquecerComParcelamento(resultados: ResultadoBuscaPreco[]): Promise<ResultadoBuscaPreco[]> {
  if (resultados[0]?.fonte !== "estoque" && resultados[0]?.fonte !== "lacrados") return resultados;

  const { calcularDestaquePrecoLoja } = await import("@/services/precificacao/precificacao-publico.service");

  return Promise.all(
    resultados.map(async (r) => {
      if (r.fonte !== "estoque" && r.fonte !== "lacrados") return r;
      try {
        const destaque = await calcularDestaquePrecoLoja(r.preco, null);
        const parcelamento = destaque.maiorParcelaSemJuros
          ? `em até ${destaque.maiorParcelaSemJuros}x de R$ ${destaque.valorDaMaiorParcelaSemJuros?.toFixed(2)} sem juros`
          : null;
        return { ...r, parcelamento };
      } catch {
        return r; // motor de preço falhou — segue sem parcelamento, não trava a resposta
      }
    })
  );
}
