"use server";

import { revalidatePath } from "next/cache";
import * as service from "./central-loja.service";
import type { ActionResult } from "@/types";

function revalidar() {
  revalidatePath("/loja-admin", "layout");
}

function handleErro(err: unknown, fallback: string): ActionResult {
  return { success: false, error: err instanceof Error ? err.message : fallback };
}

export async function criarMarcaAction(nome: string): Promise<ActionResult> {
  try { await service.criarMarca(nome); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao criar marca"); }
}
export async function removerMarcaAction(id: string): Promise<ActionResult> {
  try { await service.removerMarca(id); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao remover"); }
}

export async function criarColecaoAction(input: { nome: string; descricao?: string }): Promise<ActionResult> {
  try { await service.criarColecao(input); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao criar coleção"); }
}
export async function removerColecaoAction(id: string): Promise<ActionResult> {
  try { await service.removerColecao(id); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao remover"); }
}

export async function criarCupomAction(input: {
  codigo: string; tipoDesconto: "percentual" | "valor_fixo" | "cashback"; valor: number;
  valorMinimoPedido?: number; limiteUso?: number; validoAte?: string;
}): Promise<ActionResult> {
  try { await service.criarCupom(input); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao criar cupom"); }
}
export async function alternarCupomAtivoAction(id: string, ativo: boolean): Promise<ActionResult> {
  try { await service.alternarCupomAtivo(id, ativo); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao atualizar"); }
}
export async function removerCupomAction(id: string): Promise<ActionResult> {
  try { await service.removerCupom(id); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao remover"); }
}

export async function atualizarRegraFreteAction(id: string, input: { valor?: number; prazo_dias_uteis?: number; ativo?: boolean }): Promise<ActionResult> {
  try { await service.atualizarRegraFrete(id, input); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao salvar"); }
}
export async function criarRegraFreteAction(input: { regiao: string; valor: number; prazoDiasUteis: number }): Promise<ActionResult> {
  try { await service.criarRegraFrete(input); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao criar"); }
}

export async function aprovarAvaliacaoAction(id: string, aprovado: boolean): Promise<ActionResult> {
  try { await service.aprovarAvaliacao(id, aprovado); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao atualizar"); }
}
export async function removerAvaliacaoAction(id: string): Promise<ActionResult> {
  try { await service.removerAvaliacao(id); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao remover"); }
}

export async function atualizarConfigSeoAction(input: { titulo_padrao?: string; descricao_padrao?: string }): Promise<ActionResult> {
  try { await service.atualizarConfigSeo(input); revalidar(); return { success: true, data: undefined }; }
  catch (err) { return handleErro(err, "Erro ao salvar"); }
}

/** Server Action pública — chamada pelo checkout (client component), sem sessão de staff. */
export async function listarRegrasFretePublicoAction(): Promise<ActionResult<Awaited<ReturnType<typeof service.listarRegrasFretePublico>>>> {
  try {
    const regras = await service.listarRegrasFretePublico();
    return { success: true, data: regras };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar entrega" };
  }
}
