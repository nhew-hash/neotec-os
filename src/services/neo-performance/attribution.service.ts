import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttributionEvento } from "@/types";

export interface RegistrarAttributionInput {
  cliente_id?: string;
  card_id?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  campaign_id?: string;
  adset?: string;
  adset_id?: string;
  ad?: string;
  ad_id?: string;
  keyword?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
}

/**
 * Registra um "toque" de atribuição (Seção 6). Chamado tanto do primeiro
 * contato (webhook do WhatsApp, formulário do site) quanto de toques
 * seguintes — por isso usa o client admin (Service Role), mesmo padrão já
 * usado pelo webhook da Meta em whatsapp.service.ts: esses pontos de
 * entrada não têm sessão de usuário autenticado pra RLS usar.
 */
export async function registrarEvento(input: RegistrarAttributionInput): Promise<AttributionEvento> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("attribution_eventos").insert(input).select("*").single();
  if (error) throw new Error(`Não foi possível registrar o evento de atribuição: ${error.message}`);
  return data;
}

/** Primeiro e último toque de um cliente — Seção 6 pede os dois. */
export async function buscarAtribuicaoCliente(clienteId: string): Promise<{ primeiroToque: AttributionEvento | null; ultimoToque: AttributionEvento | null }> {
  const supabase = await createClient();
  const [{ data: primeiro }, { data: ultimo }] = await Promise.all([
    supabase.from("attribution_eventos").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("attribution_eventos").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { primeiroToque: primeiro ?? null, ultimoToque: ultimo ?? null };
}

/**
 * Resolve a cadeia Campanha → Anúncio → Lead → Cliente → Venda (Seção 6):
 * dado um conjunto de vendas, devolve, pra cada uma, o último toque de
 * atribuição do cliente ANTES da venda (last-click simples — critério de
 * atribuição mais sofisticado, como multi-touch, fica pra Fase 2+).
 */
export async function resolverAtribuicaoDeVendas(
  vendas: { id: string; cliente_id: string | null; data_venda: string }[]
): Promise<Map<string, AttributionEvento | null>> {
  const resultado = new Map<string, AttributionEvento | null>();
  const clienteIds = [...new Set(vendas.map((v) => v.cliente_id).filter((id): id is string => !!id))];
  if (clienteIds.length === 0) return resultado;

  const supabase = await createClient();
  const { data: eventos, error } = await supabase
    .from("attribution_eventos")
    .select("*")
    .in("cliente_id", clienteIds)
    .order("criado_em", { ascending: true });
  if (error) throw new Error(`Não foi possível resolver a atribuição das vendas: ${error.message}`);

  const porCliente = new Map<string, AttributionEvento[]>();
  for (const evento of eventos ?? []) {
    if (!evento.cliente_id) continue;
    const lista = porCliente.get(evento.cliente_id) ?? [];
    lista.push(evento);
    porCliente.set(evento.cliente_id, lista);
  }

  for (const venda of vendas) {
    if (!venda.cliente_id) {
      resultado.set(venda.id, null);
      continue;
    }
    const eventosCliente = porCliente.get(venda.cliente_id) ?? [];
    const antesDaVenda = eventosCliente.filter((e) => e.criado_em <= venda.data_venda);
    resultado.set(venda.id, antesDaVenda.at(-1) ?? null);
  }

  return resultado;
}
