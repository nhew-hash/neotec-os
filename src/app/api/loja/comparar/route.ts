import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota pública (comparador da loja, sem sessão) — usa as funções
 * SECURITY DEFINER da Fase 61, nunca consulta a tabela direto (RLS
 * bloquearia sem sessão de usuário).
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

  const produtosComAparelhos = (produtos ?? []).map((p) => ({
    ...p,
    aparelhos: (aparelhos ?? []).filter((a) => a.produto_id === p.id),
  }));

  return NextResponse.json({ produtos: produtosComAparelhos });
}
