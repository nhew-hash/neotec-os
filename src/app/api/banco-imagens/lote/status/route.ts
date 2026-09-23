import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autenticarRequisicaoLote, obterLojaIdParaLote } from "@/services/banco-imagens/banco-imagens-lote.service";

/**
 * GET /api/banco-imagens/lote/status?origem_ids=A,B — conferência
 * pós-importação (Fase 247): pra cada `origem_id`, devolve o grupo_id,
 * quantas fotos ele tem hoje e quantos itens do catálogo estão
 * vinculados a ele agora.
 */
export async function GET(request: NextRequest) {
  const erroAuth = autenticarRequisicaoLote(request);
  if (erroAuth) return erroAuth;

  const origemIdsParam = request.nextUrl.searchParams.get("origem_ids");
  if (!origemIdsParam) {
    return NextResponse.json({ error: "Informe ?origem_ids=A,B,C" }, { status: 400 });
  }
  const origemIds = origemIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
  if (origemIds.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um origem_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  let lojaId: string;
  try {
    lojaId = await obterLojaIdParaLote(admin);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao determinar a loja" }, { status: 500 });
  }

  const { data: grupos, error } = await admin
    .from("banco_imagens_grupos")
    .select("id, origem_id, marca, modelo, cor, categoria, classificacao, observacao")
    .eq("loja_id", lojaId)
    .in("origem_id", origemIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grupoIds = (grupos ?? []).map((g) => g.id);

  const [{ data: fotos }, { data: produtosVinculados }, { data: aparelhosVinculados }, { data: variantesVinculadas }] = await Promise.all([
    admin.from("banco_imagens_fotos").select("id, grupo_id").in("grupo_id", grupoIds.length ? grupoIds : ["00000000-0000-0000-0000-000000000000"]),
    admin.from("produtos").select("id, banco_imagens_grupo_id").in("banco_imagens_grupo_id", grupoIds.length ? grupoIds : ["00000000-0000-0000-0000-000000000000"]),
    admin.from("aparelhos").select("id, banco_imagens_grupo_id").in("banco_imagens_grupo_id", grupoIds.length ? grupoIds : ["00000000-0000-0000-0000-000000000000"]),
    admin.from("catalogo_lacrados_variantes").select("id, banco_imagens_grupo_id").in("banco_imagens_grupo_id", grupoIds.length ? grupoIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const contarPorGrupo = (linhas: { banco_imagens_grupo_id: string | null }[] | null, grupoId: string) =>
    (linhas ?? []).filter((l) => l.banco_imagens_grupo_id === grupoId).length;

  const resultado = origemIds.map((origemId) => {
    const grupo = (grupos ?? []).find((g) => g.origem_id === origemId);
    if (!grupo) return { origem_id: origemId, encontrado: false };
    return {
      origem_id: origemId,
      encontrado: true,
      grupo_id: grupo.id,
      marca: grupo.marca,
      modelo: grupo.modelo,
      cor: grupo.cor,
      categoria: grupo.categoria,
      classificacao: grupo.classificacao,
      observacao: grupo.observacao,
      total_fotos: (fotos ?? []).filter((f) => f.grupo_id === grupo.id).length,
      vinculos: {
        produtos: contarPorGrupo(produtosVinculados, grupo.id),
        aparelhos: contarPorGrupo(aparelhosVinculados, grupo.id),
        lacrados: contarPorGrupo(variantesVinculadas, grupo.id),
      },
    };
  });

  return NextResponse.json({ grupos: resultado });
}
