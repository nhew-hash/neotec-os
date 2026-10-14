import { createClient } from "@/lib/supabase/server";
import type { PdvVendaValues } from "./pdv.schema";
import { calcularPercentualDesconto } from "./desconto";

export interface AprovacaoDesconto {
  id: string;
  status: "pendente" | "aprovada" | "recusada" | "usada" | "expirada";
  solicitante_id: string;
  solicitante_nome: string | null;
  aprovador_id: string | null;
  valor_bruto: number;
  valor_desconto: number;
  percentual: number;
  motivo: string | null;
  decisao_motivo: string | null;
  criado_em: string;
  decidido_em: string | null;
  expira_em: string;
}

const CAMPOS = "id, status, solicitante_id, aprovador_id, valor_bruto, valor_desconto, percentual, motivo, decisao_motivo, criado_em, decidido_em, expira_em, solicitante:usuarios!solicitante_id(nome)";

function mapear(r: Record<string, unknown>): AprovacaoDesconto {
  const solicitante = r.solicitante as { nome?: string } | null;
  return { ...(r as unknown as AprovacaoDesconto), solicitante_nome: solicitante?.nome ?? null };
}

/** O vendedor pede aprovação para o desconto do carrinho atual. O servidor recalcula o bruto; nada vem do cliente além dos itens. */
export async function solicitarAprovacaoDesconto(venda: PdvVendaValues, motivo: string | null, usuarioId: string): Promise<string> {
  const supabase = await createClient();
  const valorBruto = venda.itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0);
  if (venda.desconto <= 0) throw new Error("Não há desconto para aprovar.");
  if (venda.desconto > valorBruto) throw new Error("O desconto não pode ser maior que o valor dos itens.");
  const { data, error } = await supabase.from("aprovacoes_desconto").insert({
    solicitante_id: usuarioId,
    valor_bruto: valorBruto,
    valor_desconto: venda.desconto,
    percentual: calcularPercentualDesconto(valorBruto, venda.desconto),
    motivo: motivo?.trim() || null,
    payload: venda,
  }).select("id").single();
  if (error || !data) throw new Error(`Não foi possível pedir a aprovação: ${error?.message}`);
  return data.id;
}

export async function listarAprovacoesPendentes(): Promise<AprovacaoDesconto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("aprovacoes_desconto").select(CAMPOS).eq("status", "pendente").gt("expira_em", new Date().toISOString()).order("criado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapear(r as Record<string, unknown>));
}

export async function listarMinhasAprovacoes(usuarioId: string): Promise<AprovacaoDesconto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("aprovacoes_desconto").select(CAMPOS).eq("solicitante_id", usuarioId).order("criado_em", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapear(r as Record<string, unknown>));
}

/** Só gerente/admin (a RLS também exige). Decisão e motivo ficam na própria linha + trilha de auditoria. */
export async function decidirAprovacaoDesconto(id: string, aprovar: boolean, motivo: string | null, aprovadorId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("aprovacoes_desconto")
    .update({ status: aprovar ? "aprovada" : "recusada", aprovador_id: aprovadorId, decisao_motivo: motivo?.trim() || null, decidido_em: new Date().toISOString() })
    .eq("id", id).eq("status", "pendente").select("id, valor_desconto, percentual, solicitante_id");
  if (error) throw new Error(`Não foi possível registrar a decisão: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Esta solicitação já foi decidida ou venceu.");
  await supabase.rpc("registrar_auditoria", {
    p_entidade: "aprovacoes_desconto", p_entidade_id: id, p_acao: aprovar ? "aprovada" : "recusada",
    p_dados: { valor_desconto: data[0].valor_desconto, percentual: data[0].percentual, solicitante_id: data[0].solicitante_id, motivo: motivo ?? null },
  });
}
