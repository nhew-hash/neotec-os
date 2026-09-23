"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import {
  avaliarPorModeloId,
  criarAvaliacao,
  aprovarAvaliacao,
  reprovarAvaliacao,
  cancelarAvaliacao,
  iniciarAvaliacaoFisica,
  salvarModeloTradeIn,
  duplicarModeloTradeIn,
  desativarModeloTradeIn,
  salvarConfigTradeIn,
  converterAvaliacaoEmEstoque,
  type AvaliacaoTradeIn,
  type TrocaModelo,
  type ConverterEmEstoqueInput,
} from "./aplicacao.service";
import type { ResultadoAvaliacaoTradeIn } from "./motor";
import { criarAvaliacaoSchema, aprovarAvaliacaoSchema, salvarModeloSchema, salvarConfigTradeInSchema } from "./trade-in.schema";

async function usuarioLogadoOuErro(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}

/** Prévia — usada pelo formulário de checklist (site e Neotec OS) pra mostrar o resultado antes de gravar. */
export async function calcularPreviaTradeInAction(input: {
  modeloId: string;
  avariasMarcadas: string[];
  bateriaSaude?: number | null;
}): Promise<ActionResult<{ modelo: TrocaModelo; resultado: ResultadoAvaliacaoTradeIn } | { encontrado: false; mensagem: string }>> {
  try {
    const resultado = await avaliarPorModeloId(input.modeloId, {
      avariasMarcadas: input.avariasMarcadas,
      bateriaSaude: input.bateriaSaude ?? null,
    });
    if (!resultado.encontrado) return { success: true, data: { encontrado: false, mensagem: resultado.mensagem } };
    return { success: true, data: { modelo: resultado.modelo, resultado: resultado.resultado } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao calcular a avaliação" };
  }
}

export async function criarAvaliacaoAction(
  input: unknown,
): Promise<ActionResult<{ avaliacao: AvaliacaoTradeIn } | { encontrado: false; mensagem: string }>> {
  const parsed = criarAvaliacaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    let usuarioId: string | null = null;
    if (parsed.data.origem === "neotec_os") {
      const usuario = await usuarioLogadoOuErro();
      if (!usuario) return { success: false, error: "Sessão expirada, faça login novamente" };
      usuarioId = usuario.id;
    }

    const resultado = await criarAvaliacao({ ...parsed.data, usuarioId });
    if ("encontrado" in resultado) return { success: true, data: { encontrado: false, mensagem: resultado.mensagem } };

    if (parsed.data.origem === "neotec_os") revalidatePath("/trade-in");
    return { success: true, data: { avaliacao: resultado.avaliacao } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar a avaliação" };
  }
}

export async function aprovarAvaliacaoAction(input: unknown): Promise<ActionResult> {
  const parsed = aprovarAvaliacaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const usuario = await usuarioLogadoOuErro();
    if (!usuario) return { success: false, error: "Sessão expirada, faça login novamente" };

    await aprovarAvaliacao({ id: parsed.data.id, usuarioId: usuario.id, valorAprovado: parsed.data.valorAprovado, motivoAlteracao: parsed.data.motivoAlteracao });
    revalidatePath("/trade-in");
    revalidatePath(`/trade-in/${parsed.data.id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao aprovar" };
  }
}

export async function reprovarAvaliacaoAction(id: string, motivo?: string): Promise<ActionResult> {
  try {
    const usuario = await usuarioLogadoOuErro();
    if (!usuario) return { success: false, error: "Sessão expirada, faça login novamente" };

    await reprovarAvaliacao(id, usuario.id, motivo);
    revalidatePath("/trade-in");
    revalidatePath(`/trade-in/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao recusar" };
  }
}

export async function cancelarAvaliacaoAction(id: string): Promise<ActionResult> {
  try {
    await cancelarAvaliacao(id);
    revalidatePath("/trade-in");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cancelar" };
  }
}

export async function iniciarAvaliacaoFisicaAction(id: string): Promise<ActionResult> {
  try {
    const usuario = await usuarioLogadoOuErro();
    if (!usuario) return { success: false, error: "Sessão expirada, faça login novamente" };

    await iniciarAvaliacaoFisica(id, usuario.id);
    revalidatePath("/trade-in");
    revalidatePath(`/trade-in/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao iniciar avaliação" };
  }
}

export async function converterAvaliacaoEmEstoqueAction(input: ConverterEmEstoqueInput): Promise<ActionResult<{ aparelhoId: string }>> {
  if (!input.imei?.trim()) return { success: false, error: "Informe o IMEI do aparelho recebido" };

  try {
    const resultado = await converterAvaliacaoEmEstoque(input);
    revalidatePath("/trade-in");
    revalidatePath(`/trade-in/${input.avaliacaoId}`);
    revalidatePath("/estoque");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao converter em estoque" };
  }
}

// --- Admin: tabela de valores ---------------------------------------------

export async function salvarModeloTradeInAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = salvarModeloSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const modelo = await salvarModeloTradeIn(parsed.data);
    revalidatePath("/trade-in/modelos");
    return { success: true, data: { id: modelo.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar modelo" };
  }
}

export async function duplicarModeloTradeInAction(id: string): Promise<ActionResult> {
  try {
    await duplicarModeloTradeIn(id);
    revalidatePath("/trade-in/modelos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao duplicar" };
  }
}

export async function desativarModeloTradeInAction(id: string): Promise<ActionResult> {
  try {
    await desativarModeloTradeIn(id);
    revalidatePath("/trade-in/modelos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao desativar" };
  }
}

export async function salvarConfigTradeInAction(input: unknown): Promise<ActionResult> {
  const parsed = salvarConfigTradeInSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await salvarConfigTradeIn(parsed.data);
    revalidatePath("/trade-in/modelos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configuração" };
  }
}
