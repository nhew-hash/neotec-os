import { NextResponse, type NextRequest } from "next/server";
import { listarProdutosLoja } from "@/services/loja/loja-publica.service";

/**
 * Busca simples por substring em nome/marca/modelo — dá pra evoluir
 * pra full-text search depois se o catálogo crescer muito, mas pro
 * volume de produtos de uma loja física, isso já resolve bem.
 */
export async function GET(request: NextRequest) {
  const termo = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (termo.length < 2) return NextResponse.json({ produtos: [] });

  const produtos = await listarProdutosLoja();
  const resultado = produtos
    .filter((p) => `${p.nome} ${p.marca ?? ""} ${p.modelo ?? ""}`.toLowerCase().includes(termo))
    .slice(0, 8);

  return NextResponse.json({ produtos: resultado });
}
