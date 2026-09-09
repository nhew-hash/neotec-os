import { createClient } from "@/lib/supabase/server";
import type { ConfigMarketingLoja, BarraTopoItem, SeloConfianca } from "@/types";

export async function obterConfigMarketingPublico(): Promise<Pick<ConfigMarketingLoja, "pix_desconto_percentual" | "estoque_baixo_limite" | "contador_vendas_ativo"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obter_config_marketing_publico");
  if (error) throw new Error(`Não foi possível carregar configuração: ${error.message}`);
  return data?.[0] ?? null;
}

export async function listarBarraTopoPublico(): Promise<BarraTopoItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_barra_topo_publico");
  if (error) throw new Error(`Não foi possível carregar a barra: ${error.message}`);
  return (data ?? []) as BarraTopoItem[];
}

export async function listarSelosConfiancaPublico(): Promise<SeloConfianca[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_selos_confianca_publico");
  if (error) throw new Error(`Não foi possível carregar os selos: ${error.message}`);
  return (data ?? []) as SeloConfianca[];
}

/**
 * Contador de vendas REAL — soma de venda_itens vinculados a esse
 * produto (por produto_id direto, ou via aparelho.produto_id). Nunca
 * número inventado. Se não tiver venda nenhuma, devolve 0 — a tela
 * decide se mostra ou esconde com 0 vendas.
 */
export async function contarVendasRealDoProduto(produtoId: string): Promise<number> {
  const supabase = await createClient();

  const { count: countDireto } = await supabase
    .from("venda_itens")
    .select("id", { count: "exact", head: true })
    .eq("produto_id", produtoId);

  const { data: aparelhosDoProduto } = await supabase.from("aparelhos").select("id").eq("produto_id", produtoId);
  const idsAparelhos = (aparelhosDoProduto ?? []).map((a) => a.id);

  let countAparelhos = 0;
  if (idsAparelhos.length > 0) {
    const { count } = await supabase
      .from("venda_itens")
      .select("id", { count: "exact", head: true })
      .in("aparelho_id", idsAparelhos);
    countAparelhos = count ?? 0;
  }

  return (countDireto ?? 0) + countAparelhos;
}

/** Estoque real de unidades disponíveis desse produto — soma aparelhos disponíveis (produto genérico) ou aparelho único (1 ou 0). */
export async function contarEstoqueRealDoProduto(produtoId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("aparelhos")
    .select("id", { count: "exact", head: true })
    .eq("produto_id", produtoId)
    .eq("status", "disponivel");
  return count ?? 0;
}
