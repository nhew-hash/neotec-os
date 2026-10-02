import { createClient } from "@/lib/supabase/server";
import { listarSaldosProdutos } from "@/services/estoque/estoque.service";

export interface ProductPerformance {
  produto_id: string;
  nome: string;
  estoque: number;
  vendas: number;
  margemMedia: number | null;
  lucroTotal: number;
  campanhaPrincipal: string | null;
}

export interface OportunidadeEstoque {
  produto_id: string;
  nome: string;
  estoque: number;
  tipo: "estoque_baixo" | "estoque_alto_boa_margem" | "estoque_parado";
  sugestao: string;
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/**
 * E-commerce Intelligence / Product Performance (Seção 33). Agregação
 * 100% sobre dado real já existente (venda_itens + estoque + produtos) —
 * não depende de nenhuma credencial externa, por isso é uma das partes
 * da Fase 4 que entra funcionando de verdade nesta sessão.
 */
export async function obterProductPerformance(diasPeriodo = 30): Promise<ProductPerformance[]> {
  const supabase = await createClient();
  const [{ data: produtos }, saldos, { data: itens }] = await Promise.all([
    supabase.from("produtos").select("id, nome"),
    listarSaldosProdutos(),
    supabase
      .from("venda_itens")
      .select("produto_id, quantidade, valor, custo, venda:vendas!inner(status, data_venda)")
      .gte("venda.data_venda", diasAtras(diasPeriodo))
      .eq("venda.status", "concluida")
      .not("produto_id", "is", null),
  ]);

  return (produtos ?? []).map((produto) => {
    const itensDoProduto = (itens ?? []).filter((i) => i.produto_id === produto.id);
    const vendas = itensDoProduto.reduce((a, i) => a + Number(i.quantidade), 0);
    const lucroTotal = itensDoProduto.reduce((a, i) => a + (Number(i.valor) - Number(i.custo)) * Number(i.quantidade), 0);
    const margemMedia = vendas > 0 ? lucroTotal / vendas : null;

    return {
      produto_id: produto.id,
      nome: produto.nome,
      estoque: saldos.get(produto.id) ?? 0,
      vendas,
      margemMedia,
      lucroTotal,
      campanhaPrincipal: null, // atribuição produto→campanha fica pra quando houver volume de attribution_eventos suficiente pra não ser ruído
    };
  });
}

/**
 * Stock-aware signals (Seção 34). Regras determinísticas, nunca altera
 * preço nem orçamento automaticamente (proibição explícita da Seção 34)
 * — só sinaliza a oportunidade/risco pra decisão humana.
 */
export async function obterOportunidadesEstoque(diasPeriodo = 30): Promise<OportunidadeEstoque[]> {
  const supabase = await createClient();
  const { data: config } = await supabase.from("neo_performance_config").select("margem_minima_pct").maybeSingle();
  const margemMinimaPct = config?.margem_minima_pct ?? null;

  const performance = await obterProductPerformance(diasPeriodo);
  const oportunidades: OportunidadeEstoque[] = [];

  for (const produto of performance) {
    if (produto.estoque <= 2 && produto.vendas > 0) {
      oportunidades.push({ produto_id: produto.produto_id, nome: produto.nome, estoque: produto.estoque, tipo: "estoque_baixo", sugestao: "Estoque baixo com demanda ativa — considerar reduzir aquisição/investimento neste produto até repor." });
      continue;
    }
    if (produto.vendas === 0 && produto.estoque > 0) {
      oportunidades.push({ produto_id: produto.produto_id, nome: produto.nome, estoque: produto.estoque, tipo: "estoque_parado", sugestao: "Sem venda no período com estoque disponível — candidato a hipótese promocional no Test Lab." });
      continue;
    }
    const margemOk = margemMinimaPct == null || produto.margemMedia == null || (produto.margemMedia / 1) >= 0; // checagem fina de % fica condicionada a ter preço de venda médio; aqui usa só margem positiva como piso
    if (produto.estoque > 10 && margemOk && produto.margemMedia != null && produto.margemMedia > 0) {
      oportunidades.push({ produto_id: produto.produto_id, nome: produto.nome, estoque: produto.estoque, tipo: "estoque_alto_boa_margem", sugestao: "Estoque alto com margem positiva — oportunidade de campanha." });
    }
  }

  return oportunidades;
}
