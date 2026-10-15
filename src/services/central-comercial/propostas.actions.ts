"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { conversaDoCliente, enviarPropostaPeloWhatsapp, historicoDaProposta, registrarCompartilhamento, registrarRespostaDoCliente, salvarProposta, simularComposicao, type ResultadoComposicao, type ResultadoSalvar } from "./propostas.service";
import type { ActionResult } from "@/types";

const EQUIPE = ["admin", "gerente", "vendedor"] as const;
const uuid = z.string().uuid();

const composicaoSchema = z.object({
  itens: z.array(z.object({ tipo: z.enum(["aparelho", "produto"]), id: uuid, quantidade: z.coerce.number().int().min(1).max(20) })).min(1, "Adicione pelo menos um item.").max(15),
  desconto: z.coerce.number().min(0, "Desconto inválido.").max(1_000_000).default(0),
  tradeInId: uuid.nullish(),
  clienteId: uuid.nullish(),
  clienteNome: z.string().max(120).nullish(),
  modo: z.enum(["whatsapp", "presencial"]).default("presencial"),
  observacoes: z.string().max(500).nullish(),
  conversaId: uuid.nullish(),
});
export type ComposicaoInput = z.input<typeof composicaoSchema>;

const msg = (err: unknown, padrao: string) => (err instanceof Error ? err.message : padrao);

export async function simularComposicaoAction(input: ComposicaoInput): Promise<ActionResult<ResultadoComposicao>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const p = composicaoSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.issues[0]?.message ?? "Dados inválidos" };
  try {
    return { success: true, data: await simularComposicao({ ...p.data, cargo: auth.cargo, usuarioId: auth.userId }) };
  } catch (err) {
    return { success: false, error: msg(err, "Erro ao calcular a proposta") };
  }
}

export async function salvarPropostaAction(input: ComposicaoInput & { clienteId: string; retomarId?: string | null }): Promise<ActionResult<ResultadoSalvar>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const cliente = uuid.safeParse(input.clienteId);
  if (!cliente.success) return { success: false, error: "Escolha o cliente para salvar a proposta." };
  const retomar = input.retomarId ? uuid.safeParse(input.retomarId) : null;
  if (retomar && !retomar.success) return { success: false, error: "Proposta inválida." };
  const p = composicaoSchema.safeParse(input);
  if (!p.success) return { success: false, error: p.error.issues[0]?.message ?? "Dados inválidos" };
  try {
    const r = await salvarProposta({ ...p.data, clienteId: cliente.data, usuarioId: auth.userId, cargo: auth.cargo, retomarId: retomar?.data ?? null });
    revalidatePath("/central-comercial");
    revalidatePath("/central-comercial/propostas");
    revalidatePath("/vendas");
    return { success: true, data: r };
  } catch (err) {
    return { success: false, error: msg(err, "Erro ao salvar a proposta") };
  }
}

export async function enviarPropostaWhatsappAction(input: { orcamentoId: string; conversaId: string; texto: string }): Promise<ActionResult> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!uuid.safeParse(input.orcamentoId).success || !uuid.safeParse(input.conversaId).success) return { success: false, error: "Dados inválidos." };
  try {
    await enviarPropostaPeloWhatsapp({ ...input, usuarioId: auth.userId, cargo: auth.cargo });
    revalidatePath("/central-comercial/propostas");
    revalidatePath("/comunicacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: msg(err, "Erro ao enviar a mensagem") };
  }
}

export async function registrarCompartilhamentoAction(input: { orcamentoId: string; tipo: "copiada" | "whatsapp_aberto" | "enviada_manual"; modo?: "whatsapp" | "presencial" | null }): Promise<ActionResult<{ historico: boolean }>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!uuid.safeParse(input.orcamentoId).success || !["copiada", "whatsapp_aberto", "enviada_manual"].includes(input.tipo)) return { success: false, error: "Dados inválidos." };
  try {
    const ok = await registrarCompartilhamento({ ...input, usuarioId: auth.userId, cargo: auth.cargo });
    revalidatePath("/central-comercial/propostas");
    return { success: true, data: { historico: ok } };
  } catch (err) {
    return { success: false, error: msg(err, "Erro ao registrar") };
  }
}

export async function registrarRespostaAction(input: { orcamentoId: string; resposta: "aceita" | "recusada" | "aguardando_resposta"; observacao?: string | null }): Promise<ActionResult<{ historico: boolean }>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!uuid.safeParse(input.orcamentoId).success || !["aceita", "recusada", "aguardando_resposta"].includes(input.resposta)) return { success: false, error: "Dados inválidos." };
  try {
    const ok = await registrarRespostaDoCliente({ ...input, usuarioId: auth.userId, cargo: auth.cargo });
    revalidatePath("/central-comercial");
    revalidatePath("/central-comercial/propostas");
    return { success: true, data: { historico: ok } };
  } catch (err) {
    return { success: false, error: msg(err, "Erro ao registrar a resposta") };
  }
}

export async function historicoPropostaAction(orcamentoId: string): Promise<ActionResult<Awaited<ReturnType<typeof historicoDaProposta>>>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!uuid.safeParse(orcamentoId).success) return { success: false, error: "Proposta inválida." };
  return { success: true, data: await historicoDaProposta(orcamentoId) };
}

export async function conversaDoClienteAction(clienteId: string): Promise<ActionResult<{ conversaId: string; naoContatar: boolean } | null>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!uuid.safeParse(clienteId).success) return { success: false, error: "Cliente inválido." };
  try {
    return { success: true, data: await conversaDoCliente(clienteId) };
  } catch (err) {
    return { success: false, error: msg(err, "Erro ao buscar a conversa") };
  }
}
