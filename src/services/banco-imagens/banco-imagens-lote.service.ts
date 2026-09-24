import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { GrupoLoteValues } from "./banco-imagens.schema";

const BUCKET = "produtos-fotos";

/**
 * Autenticação das rotas de importação em lote — diferente do cron
 * atual (que libera sem segredo quando a env não existe), aqui é
 * FAIL-CLOSED: sem `BANCO_IMAGENS_IMPORT_TOKEN` configurada, a rota
 * responde 503 e não roda nada (nunca libera "por engano" em produção
 * por falta de configuração).
 */
export function autenticarRequisicaoLote(request: NextRequest): NextResponse | null {
  const token = process.env.BANCO_IMAGENS_IMPORT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Importação em lote do banco de imagens não está configurada neste ambiente (defina BANCO_IMAGENS_IMPORT_TOKEN)." },
      { status: 503 }
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const recebido = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!recebido || recebido !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

/** loja_id explícito da env `BANCO_IMAGENS_LOJA_ID`, ou a única loja cadastrada como fallback (instalação single-tenant). */
export async function obterLojaIdParaLote(admin: SupabaseClient): Promise<string> {
  const daEnv = process.env.BANCO_IMAGENS_LOJA_ID;
  if (daEnv) return daEnv;

  const { data, error } = await admin.from("lojas").select("id").limit(1).maybeSingle();
  if (error || !data) {
    throw new Error("Não foi possível determinar a loja para a importação em lote — defina BANCO_IMAGENS_LOJA_ID.");
  }
  return data.id;
}

export function extensaoParaContentType(contentType: string): string {
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/png") return "png";
  return "jpg";
}

/** `banco-imagens/{grupo_id}/{origem_id}-{ordem}-{tipo}.{ext}` — path estável e legível, usado tanto pra gerar a URL assinada de upload quanto pra achar o arquivo depois na confirmação. */
export function caminhoStorageLote(grupoId: string, origemId: string, ordem: number, tipo: string, contentType: string): string {
  return `banco-imagens/${grupoId}/${origemId}-${ordem}-${tipo}.${extensaoParaContentType(contentType)}`;
}

interface ResultadoUpsertGrupo {
  id: string;
  acao: "criado" | "atualizado" | "adotado";
}

/**
 * Acha um grupo ANTIGO (criado pela tela "Importar pasta", antes da
 * carga em lote — por isso `origem_id` nulo) com exatamente a mesma
 * marca+modelo+cor+armazenamento do grupo que está chegando agora.
 *
 * Existe porque a constraint única de `banco_imagens_grupos` é em
 * (loja_id, marca, modelo, cor, armazenamento) — sem essa checagem, o
 * INSERT de um grupo novo com a mesma combinação de um antigo batia de
 * frente com essa constraint (`duplicate key ...`), já visto em
 * produção com IPHONE14PLUS-ROXO, IPHONE15-PRETO, IPHONE16E-PRETO.
 * `armazenamento` é sempre null nos grupos da importação em lote.
 */
async function encontrarGrupoAntigoParaAdotar(admin: SupabaseClient, lojaId: string, grupo: GrupoLoteValues): Promise<string | null> {
  let query = admin
    .from("banco_imagens_grupos")
    .select("id")
    .eq("loja_id", lojaId)
    .is("origem_id", null)
    .eq("marca", grupo.marca)
    .eq("modelo", grupo.modelo)
    .is("armazenamento", null);
  query = grupo.cor === null ? query.is("cor", null) : query.eq("cor", grupo.cor);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Falha ao procurar grupo antigo pra adotar: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Upsert manual por (loja_id, origem_id) — feito com select+insert/update
 * em vez de `.upsert()` porque o índice único de `origem_id` é PARCIAL
 * (`where origem_id is not null`), e o Postgres só usa um índice parcial
 * como alvo de `ON CONFLICT` quando a cláusula repete o mesmo predicado
 * — o cliente supabase-js não permite isso. Fazer manual evita esse
 * problema e é o mesmo padrão já usado em `encontrarOuNulo()`.
 *
 * Fase 249: quando não existe grupo com esse `origem_id` ainda, mas
 * existe um grupo ANTIGO idêntico em marca+modelo+cor+armazenamento
 * (sem `origem_id`), adota esse grupo em vez de tentar inserir um novo
 * — evita o erro de chave duplicada e já resolve, de graça, o caso em
 * que a cor do grupo antigo era EXATAMENTE igual à nova (cor
 * equivalente diferente é resolvido à parte, por `/lote/mesclar-antigos`).
 */
export async function upsertGrupoPorOrigemId(admin: SupabaseClient, lojaId: string, grupo: GrupoLoteValues): Promise<ResultadoUpsertGrupo> {
  const { data: existente, error: erroBusca } = await admin
    .from("banco_imagens_grupos")
    .select("id")
    .eq("loja_id", lojaId)
    .eq("origem_id", grupo.origem_id)
    .maybeSingle();
  if (erroBusca) throw new Error(`Falha ao buscar grupo "${grupo.origem_id}": ${erroBusca.message}`);

  const payload = {
    loja_id: lojaId,
    origem_id: grupo.origem_id,
    categoria: grupo.categoria,
    marca: grupo.marca,
    modelo: grupo.modelo,
    cor: grupo.cor,
    cores_equivalentes: grupo.cores_equivalentes,
    modelos_equivalentes: grupo.modelos_equivalentes,
    classificacao: grupo.classificacao,
    fonte_url: grupo.fonte_url,
    observacao: grupo.observacao,
  };

  if (existente) {
    const { error } = await admin.from("banco_imagens_grupos").update(payload).eq("id", existente.id);
    if (error) throw new Error(`Falha ao atualizar grupo "${grupo.origem_id}": ${error.message}`);
    return { id: existente.id, acao: "atualizado" };
  }

  const antigoId = await encontrarGrupoAntigoParaAdotar(admin, lojaId, grupo);
  if (antigoId) {
    const { error } = await admin.from("banco_imagens_grupos").update(payload).eq("id", antigoId);
    if (error) throw new Error(`Falha ao adotar grupo antigo "${antigoId}" para "${grupo.origem_id}": ${error.message}`);
    return { id: antigoId, acao: "adotado" };
  }

  const { data: novo, error } = await admin.from("banco_imagens_grupos").insert(payload).select("id").single();
  if (error) throw new Error(`Falha ao criar grupo "${grupo.origem_id}": ${error.message}`);
  return { id: novo.id, acao: "criado" };
}

export { BUCKET as BUCKET_BANCO_IMAGENS };
