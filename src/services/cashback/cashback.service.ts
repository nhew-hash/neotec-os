import { createClient } from "@/lib/supabase/server";
import type { Cashback } from "@/types";

export async function listarCashbackPorCliente(clienteId: string): Promise<Cashback[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cashback")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar o cashback: ${error.message}`);
  return data ?? [];
}

export async function obterSaldoCashback(clienteId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_cliente_cashback_saldo")
    .select("saldo")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível calcular o saldo: ${error.message}`);
  return data ? Number(data.saldo) : 0;
}

export async function registrarCashback(input: {
  cliente_id: string;
  tipo: "credito" | "debito";
  valor: number;
  origem?: string;
}): Promise<Cashback> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cashback")
    .insert({
      cliente_id: input.cliente_id,
      tipo: input.tipo,
      valor: input.valor,
      origem: input.origem || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar o cashback: ${error.message}`);
  return data;
}
