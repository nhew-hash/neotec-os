"use server";

import { revalidatePath } from "next/cache";
import { clienteSchema } from "./clientes.schema";
import { criarCliente, atualizarCliente } from "./clientes.service";
import type { ActionResult, Cliente } from "@/types";

function extrairFormData(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    email: String(formData.get("email") ?? ""),
    data_nascimento: String(formData.get("data_nascimento") ?? ""),
    apple_id: String(formData.get("apple_id") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    estado: String(formData.get("estado") ?? ""),
    origem: (formData.get("origem") as Cliente["origem"] | null) ?? undefined,
    aceita_marketing: formData.get("aceita_marketing") === "on",
    observacoes: String(formData.get("observacoes") ?? ""),
  };
}

/**
 * Server Action de criação de cliente. Revalida o schema no servidor
 * (nunca confiar só na validação do formulário) e devolve um resultado
 * tipado, sem usar `any`.
 */
export async function criarClienteAction(
  formData: FormData
): Promise<ActionResult<Cliente>> {
  const parsed = clienteSchema.safeParse(extrairFormData(formData));

  if (!parsed.success) {
    const primeiroErro = parsed.error.issues[0]?.message ?? "Dados inválidos";
    return { success: false, error: primeiroErro };
  }

  try {
    const cliente = await criarCliente(parsed.data);
    revalidatePath("/clientes");
    return { success: true, data: cliente };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao criar cliente";
    return { success: false, error: message };
  }
}

export async function atualizarClienteAction(
  id: string,
  formData: FormData
): Promise<ActionResult<Cliente>> {
  const parsed = clienteSchema.safeParse(extrairFormData(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    const cliente = await atualizarCliente(id, parsed.data);
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/clientes");
    return { success: true, data: cliente };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado ao atualizar cliente";
    return { success: false, error: message };
  }
}
