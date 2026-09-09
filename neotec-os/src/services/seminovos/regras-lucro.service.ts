import { createClient } from "@/lib/supabase/server";
import type { RegraLucro, RegraLucroFaixa, TipoRegraLucro } from "@/types";

export interface RegraLucroComFaixas extends RegraLucro {
  faixas: RegraLucroFaixa[];
}

export async function listarRegrasLucro(): Promise<RegraLucroComFaixas[]> {
  const supabase = await createClient();
  const [{ data: regras, error }, { data: faixas }] = await Promise.all([
    supabase.from("regras_lucro").select("*").order("created_at"),
    supabase.from("regras_lucro_faixas").select("*").order("ordem"),
  ]);
  if (error) throw new Error(`Não foi possível carregar as regras: ${error.message}`);

  return (regras ?? []).map((r) => ({ ...r, faixas: (faixas ?? []).filter((f) => f.regra_id === r.id) }));
}

export async function criarRegraLucro(input: {
  nome: string; tipo: TipoRegraLucro; valorFixo?: number; percentual?: number;
  faixas?: { valorAte: number | null; lucro: number }[];
}): Promise<RegraLucro> {
  const supabase = await createClient();
  const { data: regra, error } = await supabase
    .from("regras_lucro")
    .insert({ nome: input.nome, tipo: input.tipo, valor_fixo: input.valorFixo ?? null, percentual: input.percentual ?? null })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar a regra: ${error.message}`);

  if (input.tipo === "faixa" && input.faixas?.length) {
    await supabase.from("regras_lucro_faixas").insert(
      input.faixas.map((f, i) => ({ regra_id: regra.id, valor_ate: f.valorAte, lucro: f.lucro, ordem: i }))
    );
  }

  return regra;
}

export async function removerRegraLucro(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("regras_lucro").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover: ${error.message}`);
}

export async function definirRegraPadrao(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("regras_lucro").update({ padrao: false }).neq("id", id);
  const { error } = await supabase.from("regras_lucro").update({ padrao: true }).eq("id", id);
  if (error) throw new Error(`Não foi possível definir como padrão: ${error.message}`);
}

/** Aplica a regra sobre o preço pago — sempre no servidor, nunca confia num cálculo feito no cliente. */
export function calcularPrecoComRegra(precoPago: number, regra: RegraLucroComFaixas): { precoVenda: number; lucro: number } {
  if (regra.tipo === "fixo") {
    const lucro = regra.valor_fixo ?? 0;
    return { precoVenda: precoPago + lucro, lucro };
  }

  if (regra.tipo === "percentual") {
    const percentual = regra.percentual ?? 0;
    const lucro = precoPago * (percentual / 100);
    return { precoVenda: precoPago + lucro, lucro };
  }

  // faixa — acha a primeira faixa cujo "até" é >= precoPago; se nenhuma, usa a última (valorAte null = "acima de", sempre serve de fallback).
  const faixaOrdenada = [...regra.faixas].sort((a, b) => (a.valor_ate ?? Infinity) - (b.valor_ate ?? Infinity));
  const faixa = faixaOrdenada.find((f) => f.valor_ate === null || precoPago <= f.valor_ate) ?? faixaOrdenada[faixaOrdenada.length - 1];
  const lucro = faixa?.lucro ?? 0;
  return { precoVenda: precoPago + lucro, lucro };
}
