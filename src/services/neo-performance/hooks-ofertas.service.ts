import { createClient } from "@/lib/supabase/server";
import type { HookBiblioteca, CategoriaHook, OfertaBiblioteca } from "@/types";

// ---- Hook Library (Seção 15) ----

export async function listarHooks(categoria?: CategoriaHook): Promise<HookBiblioteca[]> {
  const supabase = await createClient();
  let query = supabase.from("hooks_biblioteca").select("*").order("taxa_sucesso", { ascending: false, nullsFirst: false });
  if (categoria) query = query.eq("categoria", categoria);
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar os hooks: ${error.message}`);
  return data ?? [];
}

export async function criarHook(input: { categoria: CategoriaHook; texto: string; origem_referencia_id?: string }): Promise<HookBiblioteca> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hooks_biblioteca")
    .insert({ categoria: input.categoria, texto: input.texto, origem_referencia_id: input.origem_referencia_id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar o hook: ${error.message}`);
  return data;
}

/** Atualiza o desempenho do hook depois de um teste concluído (chamado pelo Test Lab). */
export async function registrarResultadoHook(id: string, input: { testeAdicional: boolean; venda: boolean; produto?: string }): Promise<void> {
  const supabase = await createClient();
  const { data: hook } = await supabase.from("hooks_biblioteca").select("*").eq("id", id).single();
  if (!hook) throw new Error("Hook não encontrado");

  const resultadosAtuais = (hook.resultados ?? {}) as { vendas?: number };
  const novaQuantidade = hook.quantidade_testes + (input.testeAdicional ? 1 : 0);
  const vendasAcumuladas = (resultadosAtuais.vendas ?? 0) + (input.venda ? 1 : 0);
  const resultados = { ...resultadosAtuais, vendas: vendasAcumuladas };
  const taxaSucesso = novaQuantidade > 0 ? (vendasAcumuladas / novaQuantidade) * 100 : null;
  const produtos = input.produto && !hook.produtos_utilizados.includes(input.produto) ? [...hook.produtos_utilizados, input.produto] : hook.produtos_utilizados;

  const { error } = await supabase
    .from("hooks_biblioteca")
    .update({ quantidade_testes: novaQuantidade, resultados, taxa_sucesso: taxaSucesso, produtos_utilizados: produtos })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o hook: ${error.message}`);
}

// ---- Biblioteca de ofertas (Seção 16) ----

export async function listarOfertas(): Promise<OfertaBiblioteca[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ofertas_biblioteca").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar as ofertas: ${error.message}`);
  return data ?? [];
}

export async function criarOferta(input: {
  nome: string;
  descricao?: string;
  produto?: string;
  margem_estimada?: number;
  campanha_id?: string;
}): Promise<OfertaBiblioteca> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ofertas_biblioteca")
    .insert({
      nome: input.nome,
      descricao: input.descricao ?? null,
      produto: input.produto ?? null,
      margem_estimada: input.margem_estimada ?? null,
      campanha_id: input.campanha_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar a oferta: ${error.message}`);
  return data;
}

/** Atualiza vendas/CAC/lucro da oferta a partir dos dados reais da campanha vinculada — nunca estimado à mão. */
export async function atualizarDesempenhoOferta(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: oferta } = await supabase.from("ofertas_biblioteca").select("campanha_id").eq("id", id).single();
  if (!oferta?.campanha_id) return;

  const { obterDesempenhoPorCampanha } = await import("./financeiro-performance.service");
  const desempenho = await obterDesempenhoPorCampanha(90);
  const daCampanha = desempenho.find((c) => c.campanha_id === oferta.campanha_id);
  if (!daCampanha) return;

  const { error } = await supabase
    .from("ofertas_biblioteca")
    .update({ vendas_geradas: daCampanha.compras, cac: daCampanha.cac })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o desempenho da oferta: ${error.message}`);
}
