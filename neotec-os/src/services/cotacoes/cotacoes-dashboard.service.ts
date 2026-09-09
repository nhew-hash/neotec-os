import { createClient } from "@/lib/supabase/server";

export interface DashboardCotacoes {
  ultimaImportacao: { fornecedor: string; data: string; quantidade: number } | null;
  totalCotacoesAtivas: number;
  precoMedioGeral: number | null;
  quantidadePorCategoria: { categoria: string; quantidade: number }[];
  evolucaoPrecoMedio: { data: string; precoMedio: number }[];
}

export async function obterDashboardCotacoes(): Promise<DashboardCotacoes> {
  const supabase = await createClient();

  const [{ data: ultimaCotacao }, { count: totalAtivas }, { data: itens }] = await Promise.all([
    supabase.from("cotacoes").select("fornecedor, data_cotacao, quantidade_aparelhos").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("cotacoes").select("*", { count: "exact", head: true }).eq("status", "ativa"),
    supabase
      .from("cotacao_itens")
      .select("preco, cotacao:cotacoes!inner(categoria, data_cotacao, status)")
      .eq("cotacao.status", "ativa"),
  ]);

  const itensAtivos = (itens ?? []) as unknown as { preco: number; cotacao: { categoria: string; data_cotacao: string } }[];

  const precoMedioGeral = itensAtivos.length > 0
    ? itensAtivos.reduce((acc, i) => acc + Number(i.preco), 0) / itensAtivos.length
    : null;

  const porCategoria = new Map<string, number>();
  itensAtivos.forEach((i) => porCategoria.set(i.cotacao.categoria, (porCategoria.get(i.cotacao.categoria) ?? 0) + 1));

  // Evolução — preço médio por data de cotação, últimos pontos distintos.
  const porData = new Map<string, number[]>();
  itensAtivos.forEach((i) => {
    const lista = porData.get(i.cotacao.data_cotacao) ?? [];
    lista.push(Number(i.preco));
    porData.set(i.cotacao.data_cotacao, lista);
  });

  const evolucaoPrecoMedio = Array.from(porData.entries())
    .map(([data, precos]) => ({ data, precoMedio: precos.reduce((a, b) => a + b, 0) / precos.length }))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-12); // últimos 12 pontos, pra não virar um gráfico ilegível com meses de histórico

  return {
    ultimaImportacao: ultimaCotacao
      ? { fornecedor: ultimaCotacao.fornecedor, data: ultimaCotacao.data_cotacao, quantidade: ultimaCotacao.quantidade_aparelhos }
      : null,
    totalCotacoesAtivas: totalAtivas ?? 0,
    precoMedioGeral,
    quantidadePorCategoria: Array.from(porCategoria.entries()).map(([categoria, quantidade]) => ({ categoria, quantidade })),
    evolucaoPrecoMedio,
  };
}
