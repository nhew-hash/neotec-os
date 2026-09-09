"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export interface ResultadoCupom {
  valido: boolean;
  motivo: string | null;
  tipoDesconto: "percentual" | "valor_fixo" | "cashback" | null;
  valor: number | null;
}

export async function validarCupomAction(codigo: string, valorPedido: number): Promise<ActionResult<ResultadoCupom>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("validar_cupom_publico", { p_codigo: codigo, p_valor_pedido: valorPedido });
    if (error) throw new Error(error.message);

    const linha = data?.[0];
    if (!linha) return { success: true, data: { valido: false, motivo: "Cupom não encontrado", tipoDesconto: null, valor: null } };

    return {
      success: true,
      data: { valido: linha.valido, motivo: linha.motivo, tipoDesconto: linha.tipo_desconto, valor: linha.valor },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao validar cupom" };
  }
}
