import { createClient } from "@/lib/supabase/server";
import type { LancamentoFinanceiro } from "@/types";

export type PeriodoFiltro = "hoje" | "semana" | "mes";

function calcularDataInicio(periodo: PeriodoFiltro): string {
  const agora = new Date();
  if (periodo === "hoje") {
    agora.setHours(0, 0, 0, 0);
  } else if (periodo === "semana") {
    agora.setDate(agora.getDate() - 7);
  } else {
    agora.setDate(agora.getDate() - 30);
  }
  return agora.toISOString();
}

export async function listarLancamentos(periodo: PeriodoFiltro = "mes"): Promise<LancamentoFinanceiro[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financeiro")
    .select("*")
    .gte("data", calcularDataInicio(periodo))
    .order("data", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar o financeiro: ${error.message}`);
  return data ?? [];
}

export interface ResumoFinanceiro {
  entradas: number;
  saidas: number;
  saldo: number;
}

export async function calcularResumo(periodo: PeriodoFiltro = "mes"): Promise<ResumoFinanceiro> {
  const lancamentos = await listarLancamentos(periodo);
  const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((acc, l) => acc + Number(l.valor), 0);
  const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((acc, l) => acc + Number(l.valor), 0);
  return { entradas, saidas, saldo: entradas - saidas };
}

export async function criarLancamento(input: {
  tipo: "entrada" | "saida";
  categoria: string;
  valor: number;
  descricao?: string;
  usuario_id: string;
}): Promise<LancamentoFinanceiro> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financeiro")
    .insert({
      tipo: input.tipo,
      categoria: input.categoria,
      valor: input.valor,
      descricao: input.descricao || null,
      origem_tipo: "outro",
      usuario_id: input.usuario_id,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar o lançamento: ${error.message}`);
  return data;
}
