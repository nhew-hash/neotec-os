import { createClient } from "@/lib/supabase/server";
import type { Garantia } from "@/types";

export async function listarGarantiasPorCliente(clienteId: string): Promise<Garantia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("garantias")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fim", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as garantias: ${error.message}`);
  return data ?? [];
}
