import { createClient } from "@/lib/supabase/server";
import type { Indicador, IndicadorMovimento } from "@/types";
import type { IndicadorFormValues, MovimentoIndicadorFormValues } from "./indicacoes.schema";

export interface IndicadorComSaldo extends Indicador {
  saldo: number;
  totalIndicacoesOS: number;
}

export async function listarIndicadores(): Promise<IndicadorComSaldo[]> {
  const supabase = await createClient();
  const { data: indicadores, error } = await supabase.from("indicadores").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar os indicadores: ${error.message}`);

  const { data: movimentos } = await supabase.from("indicador_movimentos").select("indicador_id, tipo, valor");
  const { data: osIndicadas } = await supabase.from("ordens_servico").select("indicador_id").not("indicador_id", "is", null);

  return (indicadores ?? []).map((ind) => {
    const saldo = (movimentos ?? [])
      .filter((m) => m.indicador_id === ind.id)
      .reduce((acc, m) => acc + (m.tipo === "credito" ? Number(m.valor) : -Number(m.valor)), 0);

    const totalIndicacoesOS = (osIndicadas ?? []).filter((os) => os.indicador_id === ind.id).length;

    return { ...ind, saldo, totalIndicacoesOS };
  });
}

export async function buscarIndicadorPorId(id: string): Promise<{ indicador: Indicador; movimentos: IndicadorMovimento[]; saldo: number } | null> {
  const supabase = await createClient();
  const { data: indicador, error } = await supabase.from("indicadores").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar o indicador: ${error.message}`);
  if (!indicador) return null;

  const { data: movimentos } = await supabase
    .from("indicador_movimentos")
    .select("*")
    .eq("indicador_id", id)
    .order("data", { ascending: false });

  const saldo = (movimentos ?? []).reduce((acc, m) => acc + (m.tipo === "credito" ? Number(m.valor) : -Number(m.valor)), 0);

  return { indicador, movimentos: movimentos ?? [], saldo };
}

/** Lista simples pra usar em Select (formulário de OS, por exemplo). */
export async function listarIndicadoresAtivos(): Promise<Indicador[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("indicadores").select("*").eq("ativo", true).order("nome");
  if (error) throw new Error(`Não foi possível carregar os indicadores: ${error.message}`);
  return data ?? [];
}

export async function criarIndicador(dados: IndicadorFormValues): Promise<Indicador> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("indicadores")
    .insert({ nome: dados.nome, telefone: dados.telefone || null, observacoes: dados.observacoes || null })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível cadastrar o indicador: ${error.message}`);
  return data;
}

export async function registrarMovimentoIndicador(dados: MovimentoIndicadorFormValues, usuarioId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("indicador_movimentos").insert({
    indicador_id: dados.indicador_id,
    tipo: dados.tipo,
    valor: dados.valor,
    motivo: dados.motivo || null,
    usuario_id: usuarioId,
  });
  if (error) throw new Error(`Não foi possível registrar o movimento: ${error.message}`);
}
