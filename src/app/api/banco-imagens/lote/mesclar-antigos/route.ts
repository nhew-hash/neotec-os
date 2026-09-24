import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autenticarRequisicaoLote } from "@/services/banco-imagens/banco-imagens-lote.service";
import { mesclarGruposAntigos } from "@/services/banco-imagens/banco-imagens.service";

/**
 * POST /api/banco-imagens/lote/mesclar-antigos — Fase 249, problema 1:
 * grupos criados antes da importação em lote (sem `origem_id`, cor
 * simplificada — "iPhone 13 Branco" em vez de "Estelar") disputam com
 * os grupos novos equivalentes ("Estelar", com "Branco" em
 * `cores_equivalentes`) e prendem o aparelho como ambíguo.
 *
 * Pra cada grupo antigo do mesmo modelo cuja cor bate (direto ou via
 * `cores_equivalentes`) com exatamente UM grupo novo: move os vínculos
 * (produtos/aparelhos/lacrados) pro grupo novo e apaga o antigo (as
 * fotos saem em cascata). Se bater com 0 ou 2+ grupos novos, não mescla
 * — fica listado em `nao_mesclados`.
 *
 * `?dry_run=1`: calcula tudo (inclusive quantos vínculos seriam
 * movidos) sem gravar nada.
 */
export async function POST(request: NextRequest) {
  const erroAuth = autenticarRequisicaoLote(request);
  if (erroAuth) return erroAuth;

  const dryRun = request.nextUrl.searchParams.get("dry_run") === "1";
  const admin = createAdminClient();

  try {
    const relatorio = await mesclarGruposAntigos(admin, dryRun);
    return NextResponse.json({
      mesclados: relatorio.mesclados.map((m) => ({ antigo_id: m.antigoId, novo_origem_id: m.novoOrigemId, vinculos_movidos: m.vinculosMovidos })),
      nao_mesclados: relatorio.naoMesclados.map((n) => ({ antigo_id: n.antigoId, marca: n.marca, modelo: n.modelo, cor: n.cor, motivo: n.motivo, candidatos: n.candidatos })),
      dry_run: dryRun,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao mesclar grupos antigos" }, { status: 500 });
  }
}
