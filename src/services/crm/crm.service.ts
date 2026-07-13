import { createClient } from "@/lib/supabase/server";
import type { Cliente, Retorno } from "@/types";

/**
 * Agenda de retornos do CRM. O funil em si (cards/etapas) vive em
 * services/crm-pipeline — este arquivo ficou só com a agenda porque o
 * funil antigo (baseado em conversas.etapa_funil) foi removido na Fase 10.
 * Nome do arquivo mantido para não gerar churn de import sem necessidade
 * técnica real; o escopo é o que mudou.
 */

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

/**
 * Retornos pendentes de HOJE — usado dentro de "Follow-ups pendentes" no
 * Pipeline (services/crm-pipeline), pra não misturar com a agenda
 * completa de /crm/retornos (essa continua mostrando todos os pendentes).
 */
export async function listarRetornosDeHoje(): Promise<RetornoComCliente[]> {
  const supabase = await createClient();
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(inicioHoje);
  fimHoje.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("retornos")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .eq("status", "pendente")
    .gte("data_retorno", inicioHoje.toISOString())
    .lte("data_retorno", fimHoje.toISOString())
    .order("data_retorno", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar os retornos de hoje: ${error.message}`);

  return (data ?? []) as unknown as RetornoComCliente[];
}
