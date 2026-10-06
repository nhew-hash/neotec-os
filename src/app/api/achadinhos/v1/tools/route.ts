import { NextResponse } from "next/server";
import { escopoPermite } from "@/lib/achadinhos/chaves";
import { autenticarRequisicao } from "@/services/achadinhos/achadinhos.api";
import { FERRAMENTAS } from "@/services/achadinhos/achadinhos.operacoes";

export const dynamic = "force-dynamic";

/** Lista as ferramentas que a chave pode usar (nome, descrição, escopo e JSON Schema). */
export async function GET(request: Request) {
  const ctx = await autenticarRequisicao(request);
  if (!ctx) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  const ferramentas = FERRAMENTAS
    .filter((f) => escopoPermite(ctx.ator.escopos, f.escopo))
    .map((f) => ({ nome: f.nome, descricao: f.descricao, escopo: f.escopo, entrada: f.entrada }));
  return NextResponse.json({ ok: true, ferramentas }, { headers: { "Cache-Control": "no-store" } });
}
