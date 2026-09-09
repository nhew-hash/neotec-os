"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { novaCotacaoSchema, type NovaCotacaoValues } from "./cotacoes.schema";
import { interpretarTextoCotacao, type ResultadoInterpretacaoIA } from "./cotacoes-ia.service";
import {
  criarCotacao, arquivarCotacao, ativarCotacao, duplicarCotacao,
} from "./cotacoes.service";
import { salvarPrioridadeBuscaPreco, criarMapeamentoEmojiCor, removerMapeamentoEmojiCor } from "./cotacoes-config.service";
import type { ActionResult } from "@/types";

export async function interpretarCotacaoAction(
  texto: string,
  categoria: string
): Promise<ActionResult<ResultadoInterpretacaoIA>> {
  if (!texto.trim()) return { success: false, error: "Cole o texto da cotação" };

  try {
    const resultado = await interpretarTextoCotacao(texto, categoria || "Não informada");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao interpretar o texto" };
  }
}

export async function salvarCotacaoAction(dados: NovaCotacaoValues): Promise<ActionResult<{ id: string }>> {
  const parsed = novaCotacaoSchema.safeParse(dados);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    const cotacao = await criarCotacao(parsed.data, user.id);
    revalidatePath("/cotacoes");
    return { success: true, data: { id: cotacao.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar a cotação" };
  }
}

export async function arquivarCotacaoAction(id: string): Promise<ActionResult> {
  try {
    await arquivarCotacao(id);
    revalidatePath("/cotacoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao arquivar" };
  }
}

export async function ativarCotacaoAction(id: string): Promise<ActionResult> {
  try {
    await ativarCotacao(id);
    revalidatePath("/cotacoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reativar" };
  }
}

export async function duplicarCotacaoAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const nova = await duplicarCotacao(id, user.id);
    revalidatePath("/cotacoes");
    return { success: true, data: { id: nova.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao duplicar" };
  }
}

export async function salvarPrioridadeBuscaAction(ordem: string[]): Promise<ActionResult> {
  try {
    await salvarPrioridadeBuscaPreco(ordem);
    revalidatePath("/configuracoes/cotacoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar prioridade" };
  }
}

export async function criarMapeamentoEmojiAction(formData: FormData): Promise<ActionResult> {
  const emoji = String(formData.get("emoji") ?? "").trim();
  const cor = String(formData.get("cor") ?? "").trim();
  if (!emoji || !cor) return { success: false, error: "Informe o emoji e a cor" };

  try {
    await criarMapeamentoEmojiCor(emoji, cor);
    revalidatePath("/configuracoes/cotacoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar emoji" };
  }
}

export async function removerMapeamentoEmojiAction(id: string): Promise<ActionResult> {
  try {
    await removerMapeamentoEmojiCor(id);
    revalidatePath("/configuracoes/cotacoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover" };
  }
}

export async function buscarItensCotacaoAction(termo: string) {
  const { buscarItensCotacao } = await import("./cotacoes-busca.service");
  if (!termo.trim()) return { success: true as const, data: [] };
  try {
    const itens = await buscarItensCotacao(termo);
    return { success: true as const, data: itens };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Erro na busca" };
  }
}
