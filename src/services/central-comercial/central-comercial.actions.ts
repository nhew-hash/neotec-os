"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { criarOrcamento } from "@/services/vendas/vendas.service";
import { alternarModeloChecklist, atualizarTarefa, criarModeloChecklist, definirMeta, simularProposta, type ResultadoProposta } from "./central-comercial.service";
import type { ActionResult } from "@/types";

const EQUIPE = ["admin", "gerente", "vendedor"] as const;
const TODOS_COM_ROTINA = ["admin", "gerente", "vendedor", "tecnico", "caixa"] as const;
const GESTAO = ["admin", "gerente"] as const;

const propostaSchema = z.object({
  tipo: z.enum(["aparelho", "produto"]),
  itemId: z.string().uuid("Escolha um item."),
  desconto: z.coerce.number().min(0, "Desconto inválido.").default(0),
  tradeInId: z.string().uuid().optional().nullable(),
  clienteNome: z.string().max(120).optional().nullable(),
});

export async function simularPropostaAction(input: z.input<typeof propostaSchema>): Promise<ActionResult<ResultadoProposta>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = propostaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  try {
    const dados = await simularProposta({ ...parsed.data, cargo: auth.cargo });
    return { success: true, data: dados };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao calcular a proposta" };
  }
}

/**
 * Salva a proposta como orçamento (módulo já existente de Vendas). O VALOR gravado é recalculado
 * aqui no servidor a partir do motor de preços — nunca vem do navegador.
 */
export async function salvarPropostaComoOrcamentoAction(input: z.input<typeof propostaSchema> & { clienteId: string; validadeDias?: number }): Promise<ActionResult<{ orcamentoId: string }>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const clienteId = z.string().uuid("Escolha o cliente.").safeParse(input.clienteId);
  if (!clienteId.success) return { success: false, error: clienteId.error.issues[0].message };
  const parsed = propostaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  try {
    const r = await simularProposta({ ...parsed.data, cargo: auth.cargo });
    if (r.avaliacaoDesconto.situacao === "requer_aprovacao") {
      return { success: false, error: `Este desconto (${r.avaliacaoDesconto.percentual}%) passa do seu limite de ${r.avaliacaoDesconto.limite}%. Peça a aprovação do gerente no PDV antes de salvar o orçamento.` };
    }
    const dias = Math.min(Math.max(Math.trunc(input.validadeDias ?? 3), 1), 30);
    const orc = await criarOrcamento({
      cliente_id: clienteId.data,
      usuario_id: auth.userId,
      aparelho_id: r.item.tipo === "aparelho" ? r.item.id : undefined,
      produto_id: r.item.tipo === "produto" ? r.item.id : undefined,
      valor: r.proposta.aVista,
      forma_pagamento: "pix",
      validade: new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10),
    });
    revalidatePath("/vendas");
    revalidatePath("/central-comercial");
    return { success: true, data: { orcamentoId: orc.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar o orçamento" };
  }
}

export async function atualizarTarefaAction(id: string, concluida: boolean, observacao: string): Promise<ActionResult> {
  const auth = await exigirCargo(TODOS_COM_ROTINA);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await atualizarTarefa(id, concluida ? "concluida" : "pendente", observacao);
    revalidatePath("/central-comercial");
    revalidatePath("/central-comercial/gerente");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar a tarefa" };
  }
}

const modeloSchema = z.object({
  titulo: z.string().trim().min(3, "Dê um nome à tarefa (mínimo 3 letras).").max(120),
  descricao: z.string().max(500).default(""),
  cargo: z.enum(["vendedor", "gerente", "tecnico", "caixa"]),
  frequencia: z.enum(["diaria", "semanal", "mensal"]),
  dia_semana: z.coerce.number().int().min(0).max(6).nullable().default(null),
  dia_mes: z.coerce.number().int().min(1).max(31).nullable().default(null),
  prazo_hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido."),
});

export async function criarModeloChecklistAction(input: z.input<typeof modeloSchema>): Promise<ActionResult> {
  const auth = await exigirCargo(GESTAO);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = modeloSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  try {
    await criarModeloChecklist(parsed.data, auth.userId);
    revalidatePath("/central-comercial/gerente");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar a tarefa" };
  }
}

export async function alternarModeloChecklistAction(id: string, ativo: boolean): Promise<ActionResult> {
  const auth = await exigirCargo(GESTAO);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    await alternarModeloChecklist(id, ativo);
    revalidatePath("/central-comercial/gerente");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}

export async function definirMetaAction(usuarioId: string | null, valor: number): Promise<ActionResult> {
  const auth = await exigirCargo(GESTAO);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (usuarioId !== null && !z.string().uuid().safeParse(usuarioId).success) return { success: false, error: "Usuário inválido." };
  try {
    await definirMeta({ usuarioId, valor }, auth.userId);
    revalidatePath("/central-comercial");
    revalidatePath("/central-comercial/gerente");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar a meta" };
  }
}
