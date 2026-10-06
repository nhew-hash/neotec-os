"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formularioParaEntrada, type FormularioProduto } from "@/lib/achadinhos/formulario";
import type { ActionResult } from "@/types";
import { executarFerramenta, type ResultadoFerramenta } from "./achadinhos.operacoes";
import { criarChaveApi, obterContextoAdmin, revogarChaveApi } from "./achadinhos.admin.service";
import { revalidarCaminhos } from "./achadinhos.api";

/**
 * Fase 263 — Server Actions do painel. Toda alteração de produto passa por
 * `executarFerramenta`, a MESMA camada do conector do Claude: as regras
 * (preço/desconto honestos, domínios do link, log de auditoria) são iguais.
 */

type Saida<T = undefined> = ActionResult<T>;

function mensagem(r: Extract<ResultadoFerramenta, { ok: false }>): string {
  return r.codigo === "nao_autorizado" ? "Você não tem permissão para isso." : r.erro;
}

async function rodar(nome: string, args: unknown) {
  const ctx = await obterContextoAdmin();
  if (!ctx) return { ctx: null, r: null } as const;
  const r = await executarFerramenta(nome, args, ctx.ator, ctx.repo);
  if (r.ok) {
    revalidarCaminhos(r.revalidar);
    revalidatePath("/achadinhos-admin");
  }
  return { ctx, r } as const;
}

const SEM_ACESSO = { success: false, error: "Sessão expirada ou sem permissão. Entre novamente." } as const;

export async function salvarProdutoAction(id: string | null, form: FormularioProduto): Promise<Saida<{ id: string; slug: string }>> {
  const conv = formularioParaEntrada(form, id ? "editar" : "criar");
  if (!conv.ok) return { success: false, error: conv.erro };
  const { ctx, r } = await rodar(id ? "update_product" : "create_product", id ? { id, ...conv.entrada } : conv.entrada);
  if (!ctx || !r) return SEM_ACESSO;
  if (!r.ok) return { success: false, error: mensagem(r) };
  const p = r.produto!;
  return { success: true, data: { id: p.id, slug: p.slug } };
}

export async function mudarStatusAction(id: string, destino: "ativo" | "pausado" | "arquivado"): Promise<Saida> {
  const nome = { ativo: "activate_product", pausado: "pause_product", arquivado: "archive_product" }[destino];
  const { ctx, r } = await rodar(nome, { id });
  if (!ctx || !r) return SEM_ACESSO;
  return r.ok ? { success: true, data: undefined } : { success: false, error: mensagem(r) };
}

export async function alternarDestaqueAction(id: string, destaque: boolean): Promise<Saida> {
  const { ctx, r } = await rodar("update_product", { id, destaque });
  if (!ctx || !r) return SEM_ACESSO;
  return r.ok ? { success: true, data: undefined } : { success: false, error: mensagem(r) };
}

export async function alterarOrdemAction(id: string, ordem: number): Promise<Saida> {
  if (!Number.isInteger(ordem)) return { success: false, error: "Ordem precisa ser um número inteiro" };
  const { ctx, r } = await rodar("update_product", { id, ordem });
  if (!ctx || !r) return SEM_ACESSO;
  return r.ok ? { success: true, data: undefined } : { success: false, error: mensagem(r) };
}

/** A confirmação é montada AQUI a partir do slug real do produto — o diálogo do painel é a confirmação humana. */
export async function excluirProdutoAction(id: string): Promise<Saida> {
  const ctx = await obterContextoAdmin();
  if (!ctx) return SEM_ACESSO;
  const p = await ctx.repo.buscarPorId(id);
  if (!p || p.excluido_em) return { success: false, error: "Produto não encontrado" };
  const { r } = await rodar("delete_product", { id, confirmacao: `EXCLUIR ${p.slug}` });
  if (!r) return SEM_ACESSO;
  return r.ok ? { success: true, data: undefined } : { success: false, error: mensagem(r) };
}

const TIPOS_IMAGEM: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function uploadImagemAction(formData: FormData): Promise<Saida<{ url: string }>> {
  try {
    const ctx = await obterContextoAdmin();
    if (!ctx) return SEM_ACESSO;
    const arquivo = formData.get("arquivo");
    if (!(arquivo instanceof File)) return { success: false, error: "Nenhum arquivo enviado" };
    const ext = TIPOS_IMAGEM[arquivo.type];
    if (!ext) return { success: false, error: "Formato não aceito. Use JPG, PNG, WEBP ou GIF." };
    if (arquivo.size > 5 * 1024 * 1024) return { success: false, error: "Imagem muito grande — máximo 5MB." };

    const supabase = await createClient();
    const caminho = `${ctx.lojaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("achadinhos").upload(caminho, Buffer.from(await arquivo.arrayBuffer()), { contentType: arquivo.type });
    if (error) return { success: false, error: "Não foi possível enviar a imagem. Tente de novo." };
    return { success: true, data: { url: supabase.storage.from("achadinhos").getPublicUrl(caminho).data.publicUrl } };
  } catch (e) {
    console.error("[achadinhos] upload:", e instanceof Error ? e.message : e);
    return { success: false, error: "Erro ao enviar imagem" };
  }
}

export async function criarChaveAction(nome: string, escopos: string[]): Promise<Saida<{ chave: string }>> {
  const ctx = await obterContextoAdmin();
  if (!ctx || ctx.cargo !== "admin") return { success: false, error: "Só administradores gerenciam chaves de API." };
  const n = nome.trim();
  if (n.length < 2 || n.length > 60) return { success: false, error: "Dê um nome à chave (2 a 60 caracteres)." };
  try {
    const { chave } = await criarChaveApi(ctx, n, escopos);
    revalidatePath("/achadinhos-admin/chaves");
    return { success: true, data: { chave } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao criar chave" };
  }
}

export async function revogarChaveAction(id: string): Promise<Saida> {
  const ctx = await obterContextoAdmin();
  if (!ctx || ctx.cargo !== "admin") return { success: false, error: "Só administradores gerenciam chaves de API." };
  try {
    await revogarChaveApi(ctx, id);
    revalidatePath("/achadinhos-admin/chaves");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao revogar" };
  }
}

