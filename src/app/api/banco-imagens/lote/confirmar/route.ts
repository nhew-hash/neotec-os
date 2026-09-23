import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmarLoteSchema } from "@/services/banco-imagens/banco-imagens.schema";
import { autenticarRequisicaoLote, obterLojaIdParaLote, BUCKET_BANCO_IMAGENS } from "@/services/banco-imagens/banco-imagens-lote.service";
import { vincularGrupos } from "@/services/banco-imagens/banco-imagens.service";

/**
 * POST /api/banco-imagens/lote/confirmar — segundo passo da importação
 * em lote (Fase 247): depois que quem chamou já subiu os arquivos pras
 * URLs assinadas devolvidas por `/preparar`, essa rota confere que cada
 * arquivo existe de fato no Storage, substitui as linhas de
 * `banco_imagens_fotos` do grupo pelas novas (apagando do Storage os
 * arquivos antigos que saíram da lista) e roda a revinculação só pra
 * esses grupos.
 *
 * Idempotente — chamar de novo com a mesma lista não duplica nada.
 * `?dry_run=1`: só valida (inclusive que os arquivos existem no
 * Storage) e simula os vínculos, sem gravar nada.
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

  const parsed = confirmarLoteSchema.safeParse(corpo);
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const resultadoGrupos: Record<string, { grupoId: string; erro?: string; fotosGravadas?: number; fotosRemovidas?: number }> = {};
  const grupoIdsConfirmados: string[] = [];

  for (const grupoConfirmar of parsed.data.grupos) {
    try {
      const { data: grupo, error: erroGrupo } = await admin
        .from("banco_imagens_grupos")
        .select("id")
        .eq("loja_id", lojaId)
        .eq("origem_id", grupoConfirmar.origem_id)
        .maybeSingle();
      if (erroGrupo || !grupo) {
        throw new Error(`Grupo com origem_id "${grupoConfirmar.origem_id}" não existe — rode /preparar antes de /confirmar.`);
      }

      // Confere que cada arquivo de fato chegou no Storage antes de
      // mexer em qualquer linha do banco.
      const { data: arquivosNoBucket, error: erroList } = await admin.storage.from(BUCKET_BANCO_IMAGENS).list(`banco-imagens/${grupo.id}`);
      if (erroList) throw new Error(`Falha ao consultar o Storage: ${erroList.message}`);
      const nomesNoBucket = new Set((arquivosNoBucket ?? []).map((f) => f.name));

      for (const foto of grupoConfirmar.fotos) {
        const nomeArquivo = foto.caminho_storage.split("/").pop() ?? "";
        if (!nomesNoBucket.has(nomeArquivo)) {
          throw new Error(`Arquivo "${foto.caminho_storage}" não foi encontrado no Storage — confirme que o upload pra URL assinada terminou antes de chamar /confirmar.`);
        }
      }

      const { data: existentes } = await admin.from("banco_imagens_fotos").select("id, caminho_storage").eq("grupo_id", grupo.id);
      const existentesPorCaminho = new Map((existentes ?? []).map((f) => [f.caminho_storage, f.id]));
      const novosCaminhos = new Set(grupoConfirmar.fotos.map((f) => f.caminho_storage));
      const paraRemover = (existentes ?? []).filter((f) => f.caminho_storage && !novosCaminhos.has(f.caminho_storage));

      if (!dryRun) {
        if (paraRemover.length > 0) {
          await admin.storage.from(BUCKET_BANCO_IMAGENS).remove(paraRemover.map((f) => f.caminho_storage!));
          await admin.from("banco_imagens_fotos").delete().in("id", paraRemover.map((f) => f.id));
        }

        for (const foto of grupoConfirmar.fotos) {
          const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET_BANCO_IMAGENS}/${foto.caminho_storage}`;
          const idExistente = existentesPorCaminho.get(foto.caminho_storage);
          if (idExistente) {
            await admin.from("banco_imagens_fotos").update({ tipo: foto.tipo, ordem: foto.ordem, url }).eq("id", idExistente);
          } else {
            await admin.from("banco_imagens_fotos").insert({ grupo_id: grupo.id, tipo: foto.tipo, ordem: foto.ordem, url, caminho_storage: foto.caminho_storage });
          }
        }
      }

      grupoIdsConfirmados.push(grupo.id);
      resultadoGrupos[grupoConfirmar.origem_id] = {
        grupoId: grupo.id,
        fotosGravadas: grupoConfirmar.fotos.length,
        fotosRemovidas: paraRemover.length,
      };
    } catch (err) {
      resultadoGrupos[grupoConfirmar.origem_id] = { grupoId: "", erro: err instanceof Error ? err.message : "Erro desconhecido" };
    }
  }

  let relatorioVinculacao = null;
  if (grupoIdsConfirmados.length > 0) {
    relatorioVinculacao = await vincularGrupos(admin, grupoIdsConfirmados, { forcar: false, dryRun });
  }

  const grupos = Object.entries(resultadoGrupos).map(([origemId, info]) => {
    if (info.erro) return { origem_id: origemId, erro: info.erro };
    const vinculos = relatorioVinculacao?.vinculadosDetalhe.filter((v) => v.grupoId === info.grupoId) ?? [];
    const ambiguos = relatorioVinculacao?.ambiguos.filter((a) => a.candidatos.includes(info.grupoId)) ?? [];
    return {
      origem_id: origemId,
      grupo_id: info.grupoId,
      fotos_gravadas: info.fotosGravadas,
      fotos_removidas: info.fotosRemovidas,
      vinculos: vinculos.map((v) => ({ tipo: v.tipo, id: v.id, nome: v.nome })),
      ambiguos: ambiguos.map((a) => ({ tipo: a.tipo, id: a.id, nome: a.nome, cor: a.cor, candidatos: a.candidatos })),
    };
  });

  return NextResponse.json({ grupos, dry_run: dryRun });
}
