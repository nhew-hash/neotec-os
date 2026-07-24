import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProdutoComparacaoRow {
  id: string; categoria: string; marca: string | null; modelo: string | null;
  nome: string; descricao_loja: string | null; preco_venda: number | null; slug: string;
}

interface AparelhoBulkRow {
  produto_id: string; cor: string | null; memoria: string | null;
  condicao: string; bateria: number | null; preco_venda: number | null;
}

/**
 * Rota pública (comparador da loja, sem sessão) — usa as funções
 * SECURITY DEFINER da Fase 61, nunca consulta a tabela direto (RLS
 * bloquearia sem sessão de usuário). Tipagem manual porque são funções
 * SQL customizadas — o Supabase não gera tipo automático pra elas.
 */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ produtos: [] });

  const supabase = await createClient();
  const [{ data: produtos }, { data: aparelhos }] = await Promise.all([
    supabase.rpc("comparar_produtos_loja", { p_ids: ids }),
    supabase.rpc("aparelhos_disponiveis_loja_bulk", { p_produto_ids: ids }),
  ]);

  const listaProdutos = (produtos ?? []) as ProdutoComparacaoRow[];
  const listaAparelhos = (aparelhos ?? []) as AparelhoBulkRow[];

  const produtosComAparelhos = listaProdutos.map((p) => ({
    ...p,
    aparelhos: listaAparelhos.filter((a) => a.produto_id === p.id),
  }));

  return NextResponse.json({ produtos: produtosComAparelhos });
}
