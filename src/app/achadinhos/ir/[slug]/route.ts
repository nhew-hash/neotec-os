import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehTrafegoAutomatico } from "@/lib/achadinhos/bots";
import {
  decidirDestino, montarRegistroClique, type ProdutoParaClique,
} from "@/services/achadinhos/achadinhos.clique.service";

export const dynamic = "force-dynamic";

/**
 * Botão "COMPRAR PELO MERCADO LIVRE": registra o `affiliate_click` e
 * redireciona pro link de afiliado do produto.
 *
 * O clique nunca bloqueia o redirecionamento — o registro roda DEPOIS da
 * resposta (`after`) e qualquer falha nele só vai pro log do servidor. O
 * visitante sempre chega no Mercado Livre. O destino só é seguido se for
 * um link https de domínio permitido (ver `decidirDestino`).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  const admin = createAdminClient();

  let produto: ProdutoParaClique | null = null;
  try {
    const { data, error } = await admin
      .from("achadinhos_produtos")
      .select("id, slug, loja_id, link_afiliado, origem, status, excluido_em")
      .eq("slug", slug.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (error) console.error("[achadinhos] erro ao buscar produto do clique:", error.message);
    produto = (data as ProdutoParaClique | null) ?? null;
  } catch (e) {
    console.error("[achadinhos] erro ao buscar produto do clique:", e instanceof Error ? e.message : e);
  }

  const destino = decidirDestino(produto);
  if (destino.tipo === "catalogo" || !produto) {
    return NextResponse.redirect(new URL("/achadinhos", request.url), { status: 302, headers });
  }

  if (!ehTrafegoAutomatico(request.headers.get("user-agent"))) {
    const registro = montarRegistroClique(produto, {
      p: url.searchParams.get("p"),
      o: url.searchParams.get("o"),
      utm_source: url.searchParams.get("utm_source"),
      utm_medium: url.searchParams.get("utm_medium"),
      utm_campaign: url.searchParams.get("utm_campaign"),
      utm_content: url.searchParams.get("utm_content"),
    });
    after(async () => {
      try {
        const { error } = await admin.from("achadinhos_cliques").insert(registro);
        if (error) console.error("[achadinhos] falha ao registrar clique:", error.message);
      } catch (e) {
        console.error("[achadinhos] falha ao registrar clique:", e instanceof Error ? e.message : e);
      }
    });
  }

  return NextResponse.redirect(destino.url, { status: 302, headers });
}
