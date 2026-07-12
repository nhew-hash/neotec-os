import { createClient } from "@/lib/supabase/server";
import type { Conversa, Cliente, EtapaFunil, Retorno } from "@/types";

export interface ConversaComCliente extends Conversa {
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp">;
}

/** Lista todas as conversas abertas, já com o cliente relacionado (para o Kanban do funil). */
export async function listarConversasComCliente(): Promise<ConversaComCliente[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversas")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as conversas: ${error.message}`);

  return (data ?? []) as unknown as ConversaComCliente[];
}

export async function moverConversaEtapa(id: string, etapa: EtapaFunil): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("conversas").update({ etapa_funil: etapa }).eq("id", id);
  if (error) throw new Error(`Não foi possível mover o lead: ${error.message}`);
}

export async function criarConversa(clienteId: string): Promise<Conversa> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversas")
    .insert({ cliente_id: clienteId })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar a conversa: ${error.message}`);
  return data;
}

export interface RetornoComCliente extends Retorno {
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp">;
}

export async function listarRetornosPendentes(): Promise<RetornoComCliente[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("retornos")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .eq("status", "pendente")
    .order("data_retorno", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar os retornos: ${error.message}`);

  return (data ?? []) as unknown as RetornoComCliente[];
}

export async function criarRetorno(input: {
  cliente_id: string;
  usuario_id: string;
  data_retorno: string;
  motivo: string;
  observacao?: string;
}): Promise<Retorno> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("retornos")
    .insert({
      cliente_id: input.cliente_id,
      usuario_id: input.usuario_id,
      data_retorno: input.data_retorno,
      motivo: input.motivo,
      observacao: input.observacao || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível agendar o retorno: ${error.message}`);
  return data;
}

export async function concluirRetorno(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("retornos").update({ status: "concluido" }).eq("id", id);
  if (error) throw new Error(`Não foi possível concluir o retorno: ${error.message}`);
}
