import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prepararLoteSchema } from "@/services/banco-imagens/banco-imagens.schema";
import {
  autenticarRequisicaoLote,
  obterLojaIdParaLote,
  upsertGrupoPorOrigemId,
  caminhoStorageLote,
  BUCKET_BANCO_IMAGENS,
} from "@/services/banco-imagens/banco-imagens-lote.service";

/**
 * POST /api/banco-imagens/lote/preparar — primeiro passo da importação
 * em lote do banco de imagens externo (Fase 247). O app roda na Vercel
 * (~4,5 MB de limite por request), então as IMAGENS não passam por
 * aqui: essa rota só cria/atualiza os metadados do grupo e devolve uma
 * URL assinada de upload por foto — quem chamou sobe o arquivo direto
 * pro Storage usando essa URL.
 *
 * Idempotente: rodar de novo com o mesmo `origem_id` atualiza os
 * metadados do grupo, nunca duplica.
 *
 * `?dry_run=1`: valida tudo e devolve o que SERIA feito, sem gravar
 * nada no banco nem gerar URL de upload de verdade.
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

  const parsed = prepararLoteSchema.safeParse(corpo);
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

  const resultadoGrupos: unknown[] = [];

  for (const grupo of parsed.data.grupos) {
    try {
      let grupoId: string;
      let acao: "criado" | "atualizado" | "simulado";

      if (dryRun) {
        grupoId = "dry-run";
        acao = "simulado";
      } else {
        const upsert = await upsertGrupoPorOrigemId(admin, lojaId, grupo);
        grupoId = upsert.id;
        acao = upsert.acao;
      }

      const uploads = [];
      for (const foto of grupo.fotos) {
        const caminhoStorage = caminhoStorageLote(dryRun ? grupo.origem_id : grupoId, grupo.origem_id, foto.ordem, foto.tipo, foto.content_type);

        if (dryRun) {
          uploads.push({ arquivo: foto.arquivo, caminho_storage: caminhoStorage, signed_url: null, token: null });
          continue;
        }

        const { data: assinada, error: erroAssinatura } = await admin.storage
          .from(BUCKET_BANCO_IMAGENS)
          .createSignedUploadUrl(caminhoStorage);
        if (erroAssinatura || !assinada) {
          throw new Error(`Falha ao gerar URL de upload para "${foto.arquivo}": ${erroAssinatura?.message ?? "erro desconhecido"}`);
        }

        uploads.push({
          arquivo: foto.arquivo,
          caminho_storage: caminhoStorage,
          signed_url: assinada.signedUrl,
          token: assinada.token,
        });
      }

      resultadoGrupos.push({ origem_id: grupo.origem_id, grupo_id: grupoId, acao, uploads });
    } catch (err) {
      resultadoGrupos.push({ origem_id: grupo.origem_id, erro: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  }

  return NextResponse.json({ grupos: resultadoGrupos, dry_run: dryRun });
}
