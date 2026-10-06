import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { extrairBearer, hashChave, normalizarEscopos } from "@/lib/achadinhos/chaves";
import type { Ator } from "@/lib/achadinhos/tipos";
import { executarFerramenta, type CodigoErro, type ResultadoFerramenta } from "./achadinhos.operacoes";
import { criarRepositorioSupabase, type AchadinhosRepository } from "./achadinhos.repository";

/**
 * Fase 263 — porta de entrada comum do conector do Claude (REST e MCP).
 * Autentica pela chave de API (Bearer), monta o repositório com service
 * role SEMPRE filtrado pela loja da chave, e executa a operação pelas
 * mesmas regras do painel (`executarFerramenta`).
 */

export interface ContextoApi {
  ator: Ator;
  repo: AchadinhosRepository;
}

const INTERVALO_ULTIMO_USO_MS = 60_000;

/** Devolve o contexto da chave, ou `null` se ausente/inválida/revogada. Nunca diz o motivo (não ajuda quem tenta adivinhar). */
export async function autenticarRequisicao(request: Request): Promise<ContextoApi | null> {
  const token = extrairBearer(request.headers.get("authorization"));
  if (!token) return null;

  const admin = createAdminClient();
  const { data: chave, error } = await admin
    .from("achadinhos_api_chaves")
    .select("id, loja_id, nome, escopos, ultimo_uso_em")
    .eq("chave_hash", hashChave(token))
    .eq("ativo", true)
    .is("revogada_em", null)
    .maybeSingle();
  if (error || !chave) return null;

  // Atualiza "último uso" no máximo 1x por minuto — não vira uma escrita por chamada.
  const ultimo = chave.ultimo_uso_em ? new Date(chave.ultimo_uso_em).getTime() : 0;
  if (Date.now() - ultimo > INTERVALO_ULTIMO_USO_MS) {
    void admin.from("achadinhos_api_chaves").update({ ultimo_uso_em: new Date().toISOString() }).eq("id", chave.id);
  }

  return {
    ator: { tipo: "claude", nome: chave.nome, id: chave.id, escopos: normalizarEscopos(chave.escopos ?? []) },
    repo: criarRepositorioSupabase(admin, chave.loja_id),
  };
}

export function revalidarCaminhos(caminhos: string[] | undefined) {
  for (const c of caminhos ?? []) {
    try {
      revalidatePath(c);
    } catch (e) {
      console.error("[achadinhos] revalidatePath falhou:", c, e instanceof Error ? e.message : e);
    }
  }
}

export async function executarComContexto(ctx: ContextoApi, nome: string, args: unknown): Promise<ResultadoFerramenta> {
  const r = await executarFerramenta(nome, args, ctx.ator, ctx.repo);
  if (r.ok) revalidarCaminhos(r.revalidar);
  return r;
}

export const STATUS_HTTP: Record<CodigoErro, number> = {
  invalido: 400,
  nao_autorizado: 403,
  nao_encontrado: 404,
  ferramenta_desconhecida: 404,
  conflito: 409,
  confirmacao_necessaria: 428,
  erro: 500,
};

/** O que sai pela API: nunca o `detalhe` interno (que vai só pro log). */
export function paraResposta(r: ResultadoFerramenta) {
  return r.ok
    ? { ok: true as const, dados: r.dados, ...(r.mensagem ? { mensagem: r.mensagem } : {}) }
    : { ok: false as const, codigo: r.codigo, erro: r.erro };
}
