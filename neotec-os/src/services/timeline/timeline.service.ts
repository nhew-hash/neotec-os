import { createClient } from "@/lib/supabase/server";
import type { TimelineEvento } from "@/types";

/**
 * Leitura apenas — a escrita da timeline é feita exclusivamente pelos
 * triggers de banco (trg_timeline_venda, trg_timeline_os, etc.), nunca
 * pela aplicação diretamente. Isso garante que nenhum evento seja
 * esquecido por um caminho de código que não passou pelo trigger.
 */
export async function listarTimelinePorCliente(clienteId: string): Promise<TimelineEvento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_eventos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar a timeline: ${error.message}`);
  return data ?? [];
}
