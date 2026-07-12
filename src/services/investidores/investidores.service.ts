import { createClient } from "@/lib/supabase/server";
import type { Investidor, InvestidorMovimento, InvestidorResumo, Aparelho } from "@/types";

export async function listarInvestidoresComResumo(): Promise<InvestidorResumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vw_investidor_resumo").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar os investidores: ${error.message}`);
  return data ?? [];
}

export async function buscarInvestidorPorId(id: string): Promise<Investidor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("investidores").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Não foi possível carregar o investidor: ${error.message}`);
  }
  return data;
}

export async function buscarResumoInvestidor(id: string): Promise<InvestidorResumo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vw_investidor_resumo").select("*").eq("investidor_id", id).maybeSingle();
  if (error) throw new Error(`Não foi possível calcular o resumo: ${error.message}`);
  return data;
}

export async function criarInvestidor(input: { nome: string; telefone?: string; observacoes?: string }): Promise<Investidor> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investidores")
    .insert({ nome: input.nome, telefone: input.telefone || null, observacoes: input.observacoes || null })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar o investidor: ${error.message}`);
  return data;
}

export async function registrarMovimentoInvestidor(input: {
  investidor_id: string;
  tipo: "aporte" | "saque";
  valor: number;
  observacao?: string;
  usuario_id: string;
}): Promise<InvestidorMovimento> {
  const supabase = await createClient();

  // Saque não pode exceder o capital livre — checagem de negócio que a
  // constraint de banco (valor > 0) não cobre sozinha.
  if (input.tipo === "saque") {
    const resumo = await buscarResumoInvestidor(input.investidor_id);
    if (!resumo || input.valor > resumo.capital_livre) {
      throw new Error("Saque maior que o capital livre disponível do investidor");
    }
  }

  const { data, error } = await supabase
    .from("investidor_movimentos")
    .insert({
      investidor_id: input.investidor_id,
      tipo: input.tipo,
      valor: input.valor,
      observacao: input.observacao || null,
      usuario_id: input.usuario_id,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar o movimento: ${error.message}`);
  return data;
}

export async function listarMovimentosPorInvestidor(id: string): Promise<InvestidorMovimento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investidor_movimentos").select("*").eq("investidor_id", id).order("data", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os movimentos: ${error.message}`);
  return data ?? [];
}

export async function listarAparelhosPorInvestidor(id: string): Promise<Aparelho[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("aparelhos").select("*").eq("investidor_id", id);
  if (error) throw new Error(`Não foi possível carregar os aparelhos: ${error.message}`);
  return data ?? [];
}
