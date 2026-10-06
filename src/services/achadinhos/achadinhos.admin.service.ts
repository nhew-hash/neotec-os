import { createClient } from "@/lib/supabase/server";
import { gerarChaveApi, normalizarEscopos } from "@/lib/achadinhos/chaves";
import type { Ator, ChaveApiAchadinho, Escopo, LogAchadinho, ProdutoAchadinho, ResumoCatalogo, StatusProduto } from "@/lib/achadinhos/tipos";
import { calcularResumoCatalogo } from "./achadinhos.operacoes";
import { criarRepositorioSupabase, type AchadinhosRepository } from "./achadinhos.repository";

/**
 * Fase 263 — contexto e leituras do PAINEL. Usa o client com a sessão da
 * pessoa logada (RLS do banco é a segunda trava: só admin/gerente enxergam
 * a tabela; chaves só admin). O ator dos logs é sempre "usuario".
 */

export interface ContextoAdmin {
  ator: Ator;
  repo: AchadinhosRepository;
  lojaId: string;
  cargo: "admin" | "gerente";
}

/** `null` se não logado ou sem cargo permitido. */
export async function obterContextoAdmin(): Promise<ContextoAdmin | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("usuarios").select("nome, cargo, loja_id").eq("id", user.id).maybeSingle();
  if (!perfil || !["admin", "gerente"].includes(perfil.cargo) || !perfil.loja_id) return null;
  const cargo = perfil.cargo as "admin" | "gerente";
  const escopos: Escopo[] = cargo === "admin" ? ["leitura", "escrita", "status", "excluir"] : ["leitura", "escrita", "status"];
  return {
    ator: { tipo: "usuario", nome: perfil.nome ?? user.email ?? "Usuário", id: user.id, escopos },
    repo: criarRepositorioSupabase(supabase, perfil.loja_id),
    lojaId: perfil.loja_id,
    cargo,
  };
}

export interface FiltroPainel { status?: StatusProduto; busca?: string }

export async function listarProdutosAdmin(ctx: ContextoAdmin, filtro: FiltroPainel): Promise<ProdutoAchadinho[]> {
  return ctx.repo.listar({ status: filtro.status, busca: filtro.busca, limite: 500 });
}

export async function buscarProdutoAdmin(ctx: ContextoAdmin, id: string): Promise<ProdutoAchadinho | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const p = await ctx.repo.buscarPorId(id);
  return p && !p.excluido_em ? p : null;
}

export function resumoDoPainel(ctx: ContextoAdmin): Promise<ResumoCatalogo> {
  return calcularResumoCatalogo(ctx.repo);
}

export async function categoriasExistentes(ctx: ContextoAdmin): Promise<string[]> {
  const todos = await ctx.repo.listar({ limite: 1000 });
  return [...new Set(todos.map((p) => p.categoria?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export type FiltroLog = "alteracoes" | "todos" | "problemas";

export async function listarLog(filtro: FiltroLog, limite = 100): Promise<LogAchadinho[]> {
  const supabase = await createClient();
  let q = supabase.from("achadinhos_log").select("*").order("criado_em", { ascending: false }).limit(limite);
  if (filtro === "alteracoes") q = q.not("operacao", "in", "(get_product,list_products,get_catalog_summary)").eq("resultado", "sucesso");
  if (filtro === "problemas") q = q.neq("resultado", "sucesso");
  const { data, error } = await q;
  if (error) throw new Error(`Achadinhos: falha ao ler atividade (${error.message})`);
  return (data ?? []) as LogAchadinho[];
}

export async function listarChaves(): Promise<ChaveApiAchadinho[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achadinhos_api_chaves")
    .select("id, nome, prefixo, escopos, ativo, criado_em, ultimo_uso_em, revogada_em")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`Achadinhos: falha ao listar chaves (${error.message})`);
  return (data ?? []) as ChaveApiAchadinho[];
}

/** Cria a chave e devolve o texto UMA vez — só o hash fica no banco. */
export async function criarChaveApi(ctx: ContextoAdmin, nome: string, escopos: string[]): Promise<{ chave: string; id: string }> {
  const lista = normalizarEscopos(escopos);
  if (!lista.includes("leitura")) lista.unshift("leitura");
  const { chave, prefixo, hash } = gerarChaveApi();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achadinhos_api_chaves")
    .insert({ loja_id: ctx.lojaId, nome, prefixo, chave_hash: hash, escopos: lista, criado_por: ctx.ator.id })
    .select("id")
    .single();
  if (error || !data) throw new Error("Não foi possível criar a chave");
  await ctx.repo.registrarLog({ ator: ctx.ator, operacao: "criar_chave_api", produto_id: null, produto_nome: null, resultado: "sucesso", detalhe: { nome, escopos: lista } });
  return { chave, id: data.id };
}

export async function revogarChaveApi(ctx: ContextoAdmin, id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achadinhos_api_chaves")
    .update({ ativo: false, revogada_em: new Date().toISOString() })
    .eq("id", id).eq("loja_id", ctx.lojaId)
    .select("nome").maybeSingle();
  if (error || !data) throw new Error("Chave não encontrada");
  await ctx.repo.registrarLog({ ator: ctx.ator, operacao: "revogar_chave_api", produto_id: null, produto_nome: null, resultado: "sucesso", detalhe: { nome: data.nome } });
}
