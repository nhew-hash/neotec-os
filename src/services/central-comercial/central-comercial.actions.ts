"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { alternarModeloChecklist, atualizarTarefa, criarModeloChecklist, definirMeta } from "./central-comercial.service";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";
import { buscarClientes, procurarDuplicados, type CandidatoDuplicado, type ClienteResultado } from "./clientes-busca.service";
import { buscarItens, type ResultadoItens } from "./itens-busca.service";
import { criarCliente } from "@/services/clientes/clientes.service";
import type { ActionResult } from "@/types";

const EQUIPE = ["admin", "gerente", "vendedor"] as const;
const TODOS_COM_ROTINA = ["admin", "gerente", "vendedor", "tecnico", "caixa"] as const;
const GESTAO = ["admin", "gerente"] as const;

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

// ---------------------------------------------------------------------------
// Busca e cadastro rápido de cliente (proposta)

export async function buscarClientesAction(q: string, pagina = 0): Promise<ActionResult<{ itens: ClienteResultado[]; temMais: boolean }>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (typeof q !== "string" || q.length > 80) return { success: false, error: "Busca inválida." };
  try {
    return { success: true, data: await buscarClientes({ q, pagina: Number.isFinite(pagina) ? pagina : 0 }) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar clientes" };
  }
}

const novoClienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(120),
  telefone: z.string().max(30),
  confirmarSimilar: z.boolean().optional(),
});

export type ResultadoCadastroRapido =
  | { status: "criado"; cliente: ClienteResultado }
  | { status: "existente"; candidatos: CandidatoDuplicado[] }
  | { status: "similar"; candidatos: CandidatoDuplicado[] };

/**
 * Cadastro rápido durante o atendimento. NÃO mescla nem altera cliente existente:
 * se o telefone já existe, devolve o cadastro para a vendedora escolher; se houver só um número parecido,
 * pede confirmação explícita antes de criar outro.
 */
export async function cadastrarClienteRapidoAction(input: z.input<typeof novoClienteSchema>): Promise<ActionResult<ResultadoCadastroRapido>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = novoClienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const telefone = normalizarTelefone(parsed.data.telefone);
  if (!telefoneValido(telefone)) return { success: false, error: "Informe o WhatsApp com DDD (10 ou 11 números)." };
  try {
    const candidatos = await procurarDuplicados(telefone);
    if (candidatos.some((c) => c.igual)) return { success: true, data: { status: "existente", candidatos: candidatos.filter((c) => c.igual) } };
    if (candidatos.length > 0 && !parsed.data.confirmarSimilar) return { success: true, data: { status: "similar", candidatos } };
    const c = await criarCliente({ nome: parsed.data.nome, whatsapp: telefone, origem: "loja_fisica", aceita_marketing: false });
    revalidatePath("/clientes");
    return { success: true, data: { status: "criado", cliente: { id: c.id, nome: c.nome, whatsapp: c.whatsapp, cidade: c.cidade ?? null, clienteDesde: c.data_cadastro ?? null, orcamentosAbertos: 0 } } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar o cliente" };
  }
}

export async function buscarItensAction(q: string, pagina = 0): Promise<ActionResult<ResultadoItens>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (typeof q !== "string" || q.length > 80) return { success: false, error: "Busca inválida." };
  try {
    return { success: true, data: await buscarItens({ q, pagina: Number.isFinite(pagina) ? pagina : 0 }) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar itens" };
  }
}

/** Modelos ativos da tabela de troca — para avaliar o aparelho do cliente sem sair da proposta. */
export async function listarModelosTrocaAction(): Promise<ActionResult<import("@/services/trade-in/aplicacao.service").TrocaModeloComAvarias[]>> {
  const auth = await exigirCargo(EQUIPE);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const { listarModelosTradeIn } = await import("@/services/trade-in/aplicacao.service");
    return { success: true, data: await listarModelosTradeIn({ somenteAtivos: true }) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Não foi possível carregar a tabela de troca" };
  }
}
