"use server";

import { revalidatePath } from "next/cache";
import { cashbackSchema } from "./cashback.schema";
import { registrarCashback } from "./cashback.service";
import type { ActionResult } from "@/types";

export async function registrarCashbackAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    valor: String(formData.get("valor") ?? ""),
    origem: String(formData.get("origem") ?? ""),
  };

  const parsed = cashbackSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await registrarCashback(parsed.data);
    revalidatePath(`/clientes/${parsed.data.cliente_id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar cashback" };
  }
}
