import { createClient } from "@/lib/supabase/server";
import type { Marca, Colecao, Cupom, RegraFrete, AvaliacaoLoja, ConfigSeoLoja } from "@/types";

// ---- Marcas ----
export async function listarMarcas(): Promise<Marca[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("marcas").select("*").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarMarca(nome: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("marcas").insert({ nome });
  if (error) throw new Error(error.message);
}
export async function removerMarca(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("marcas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Coleções ----
export async function listarColecoes(): Promise<Colecao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("colecoes").select("*").order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarColecao(input: { nome: string; descricao?: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("colecoes").insert({ nome: input.nome, descricao: input.descricao || null });
  if (error) throw new Error(error.message);
}
export async function removerColecao(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("colecoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Cupons ----
export async function listarCupons(): Promise<Cupom[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cupons").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function criarCupom(input: {
  codigo: string; tipoDesconto: "percentual" | "valor_fixo"; valor: number;
  valorMinimoPedido?: number; limiteUso?: number; validoAte?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cupons").insert({
    codigo: input.codigo.trim().toUpperCase(), tipo_desconto: input.tipoDesconto, valor: input.valor,
    valor_minimo_pedido: input.valorMinimoPedido ?? null, limite_uso: input.limiteUso ?? null, valido_ate: input.validoAte ?? null,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um cupom com esse código");
    throw new Error(error.message);
  }
}
export async function alternarCupomAtivo(id: string, ativo: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cupons").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function removerCupom(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Fretes ----
export async function listarRegrasFrete(): Promise<RegraFrete[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("regras_frete").select("*").order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function atualizarRegraFrete(id: string, input: Partial<Pick<RegraFrete, "valor" | "prazo_dias_uteis" | "ativo">>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("regras_frete").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function criarRegraFrete(input: { regiao: string; valor: number; prazoDiasUteis: number }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("regras_frete").insert({ regiao: input.regiao, valor: input.valor, prazo_dias_uteis: input.prazoDiasUteis });
  if (error) throw new Error(error.message);
}

// ---- Avaliações ----
export async function listarAvaliacoes(): Promise<AvaliacaoLoja[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("avaliacoes_loja").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function aprovarAvaliacao(id: string, aprovado: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes_loja").update({ aprovado }).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function removerAvaliacao(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes_loja").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- SEO ----
export async function buscarConfigSeo(): Promise<ConfigSeoLoja | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("config_seo_loja").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function atualizarConfigSeo(input: Partial<Pick<ConfigSeoLoja, "titulo_padrao" | "descricao_padrao">>): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("config_seo_loja").select("id").maybeSingle();
  if (!linha) throw new Error("Configuração não encontrada");
  const { error } = await supabase.from("config_seo_loja").update(input).eq("id", linha.id);
  if (error) throw new Error(error.message);
}
