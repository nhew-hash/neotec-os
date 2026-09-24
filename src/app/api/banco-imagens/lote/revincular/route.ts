import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revincularLoteSchema } from "@/services/banco-imagens/banco-imagens.schema";
import { autenticarRequisicaoLote, obterLojaIdParaLote } from "@/services/banco-imagens/banco-imagens-lote.service";
import { vincularGrupos, removerVinculosDeGrupos, resumoVinculacaoPorGrupo } from "@/services/banco-imagens/banco-imagens.service";

/**
 * POST /api/banco-imagens/lote/revincular — Fase 249, problema 3: a
 * revinculação normal nunca desfaz um vínculo já existente (por
 * design, pra não sumir com foto de alguém sem querer). Mas se um
 * grupo foi enviado com `modelos_equivalentes` errados na primeira
 * tentativa, ele pode ter "roubado" o vínculo de um item de outro
 * modelo — reenviar o grupo corrigido não desfaz esse vínculo velho
 * sozinho.
 *
 * Body: `{ "origem_ids": ["POCOC81-PRETO", ...], "forcar": true }`.
 * Com `forcar: true`: primeiro REMOVE o vínculo de tudo que hoje
 * aponta pra esses grupos, depois roda a correspondência de novo pra
 * TODO o catálogo (pega tanto os grupos informados quanto qualquer
 * item que ficou solto — mesmo efeito colateral inofensivo do botão
 * "Revincular tudo", que nunca sobrescreve vínculo já correto). Sem
 * `forcar`, só tenta completar vínculo pra quem ainda não tem nada,
 * restrito a esses grupos (não mexe em vínculo existente).
 *
 * `?dry_run=1`: calcula tudo sem gravar nada (nem a remoção).
 */
export async function POST(request: NextRequest) {
  const erroAuth = autenticarRequisicaoLote(request);
  if (erroAuth) return erroAuth;

  const dryRun = request.nextUrl.searchParams.get("dry_run") === "1";

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição precisa ser um JSON válido." }, { status: 400 });
  }

  const parsed = revincularLoteSchema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  let lojaId: string;
  try {
    lojaId = await obterLojaIdParaLote(admin);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao determinar a loja" }, { status: 500 });
  }

  const { data: grupos, error: erroGrupos } = await admin
    .from("banco_imagens_grupos")
    .select("id, origem_id")
    .eq("loja_id", lojaId)
    .in("origem_id", parsed.data.origem_ids);
  if (erroGrupos) return NextResponse.json({ error: erroGrupos.message }, { status: 500 });

  const encontrados = grupos ?? [];
  const grupoIds = encontrados.map((g) => g.id);
  const naoEncontrados = parsed.data.origem_ids.filter((id) => !encontrados.some((g) => g.origem_id === id));

  if (grupoIds.length === 0) {
    return NextResponse.json({ grupos: [], nao_encontrados: naoEncontrados, dry_run: dryRun });
  }

  let relatorio;
  if (parsed.data.forcar) {
    if (!dryRun) await removerVinculosDeGrupos(admin, grupoIds);
    // Depois de remover, roda pra TODO o catálogo (null) — os itens que
    // ficaram soltos (inclusive os de fora da lista, se algum já
    // estivesse solto por outro motivo) voltam a ser considerados, sem
    // nunca sobrescrever um vínculo que já esteja correto.
    relatorio = await vincularGrupos(admin, null, { forcar: false, dryRun });
  } else {
    relatorio = await vincularGrupos(admin, grupoIds, { forcar: false, dryRun });
  }

  const resumo = resumoVinculacaoPorGrupo(relatorio, grupoIds);
  const respostaGrupos = encontrados.map((g) => ({
    origem_id: g.origem_id,
    grupo_id: g.id,
    vinculos: resumo[g.id]?.vinculos ?? { produtos: 0, aparelhos: 0, lacrados: 0 },
    ambiguos: (resumo[g.id]?.ambiguos ?? []).map((a) => ({ tipo: a.tipo, id: a.id, nome: a.nome, cor: a.cor, candidatos: a.candidatos })),
  }));

  return NextResponse.json({ grupos: respostaGrupos, nao_encontrados: naoEncontrados, dry_run: dryRun });
}
