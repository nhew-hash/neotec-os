import { createClient } from "@/lib/supabase/server";
import type { Cotacao, CotacaoItem, StatusCotacao } from "@/types";
import type { NovaCotacaoValues } from "./cotacoes.schema";

export interface CotacaoComItens extends Cotacao {
  itens: CotacaoItem[];
}

export async function criarCotacao(dados: NovaCotacaoValues, usuarioId: string): Promise<Cotacao> {
  const supabase = await createClient();

  const { data: cotacao, error: erroCotacao } = await supabase
    .from("cotacoes")
    .insert({
      fornecedor: dados.fornecedor,
      categoria: dados.categoria,
      data_cotacao: dados.data_cotacao,
      observacao: dados.observacao || null,
      texto_original: dados.texto_original,
      quantidade_aparelhos: dados.itens.reduce((acc, i) => acc + i.quantidade, 0),
      usuario_id: usuarioId,
    })
    .select("*")
    .single();

  if (erroCotacao || !cotacao) {
    throw new Error(`Não foi possível criar a cotação: ${erroCotacao?.message}`);
  }

  const { error: erroItens } = await supabase.from("cotacao_itens").insert(
    dados.itens.map((item) => ({
      cotacao_id: cotacao.id,
      tipo_produto: item.tipo_produto || "celular",
      modelo: item.modelo,
      armazenamento: item.armazenamento || null,
      cor: item.cor || null,
      bateria_percentual: item.bateria_percentual ?? null,
      preco: item.preco,
      quantidade: item.quantidade,
      garantia: item.garantia || null,
      observacao: item.observacao || null,
    }))
  );

  if (erroItens) {
    // Cotação já foi criada — melhor deixar órfã e avisar do que
    // silenciosamente perder o registro de que a tentativa aconteceu.
    throw new Error(`Cotação criada, mas falha ao salvar os itens: ${erroItens.message}`);
  }

  return cotacao;
}

export interface FiltrosCotacoes {
  status?: StatusCotacao;
  categoria?: string;
  fornecedor?: string;
}

export async function listarCotacoes(filtros?: FiltrosCotacoes): Promise<Cotacao[]> {
  const supabase = await createClient();
  let query = supabase.from("cotacoes").select("*").order("data_cotacao", { ascending: false });

  if (filtros?.status) query = query.eq("status", filtros.status);
  if (filtros?.categoria) query = query.eq("categoria", filtros.categoria);
  if (filtros?.fornecedor) query = query.ilike("fornecedor", `%${filtros.fornecedor}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as cotações: ${error.message}`);
  return data ?? [];
}

export async function buscarCotacaoPorId(id: string): Promise<CotacaoComItens | null> {
  const supabase = await createClient();
  const { data: cotacao, error } = await supabase.from("cotacoes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a cotação: ${error.message}`);
  if (!cotacao) return null;

  const { data: itens, error: erroItens } = await supabase
    .from("cotacao_itens")
    .select("*")
    .eq("cotacao_id", id)
    .order("modelo");
  if (erroItens) throw new Error(`Não foi possível carregar os itens: ${erroItens.message}`);

  return { ...cotacao, itens: itens ?? [] };
}

/** Nunca apaga — arquivar é o "excluir" da Central de Cotações (histórico preservado, como pedido). */
export async function arquivarCotacao(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cotacoes").update({ status: "arquivada" }).eq("id", id);
  if (error) throw new Error(`Não foi possível arquivar a cotação: ${error.message}`);
}

export async function ativarCotacao(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cotacoes").update({ status: "ativa" }).eq("id", id);
  if (error) throw new Error(`Não foi possível reativar a cotação: ${error.message}`);
}

export async function duplicarCotacao(id: string, usuarioId: string): Promise<Cotacao> {
  const original = await buscarCotacaoPorId(id);
  if (!original) throw new Error("Cotação original não encontrada");

  return criarCotacao(
    {
      fornecedor: original.fornecedor,
      categoria: original.categoria,
      data_cotacao: new Date().toISOString().slice(0, 10),
      observacao: original.observacao ?? "",
      texto_original: original.texto_original,
      itens: original.itens.map((i) => ({
        tipo_produto: i.tipo_produto,
        modelo: i.modelo,
        armazenamento: i.armazenamento ?? "",
        cor: i.cor ?? "",
        bateria_percentual: i.bateria_percentual ?? undefined,
        preco: i.preco,
        quantidade: i.quantidade,
        garantia: i.garantia ?? "",
        observacao: i.observacao ?? "",
      })),
    },
    usuarioId
  );
}

export async function listarCategoriasExistentes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cotacoes").select("categoria");
  if (error) throw new Error(`Não foi possível carregar as categorias: ${error.message}`);
  return Array.from(new Set((data ?? []).map((c) => c.categoria)));
}

export async function listarFornecedoresExistentes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cotacoes").select("fornecedor");
  if (error) throw new Error(`Não foi possível carregar os fornecedores: ${error.message}`);
  return Array.from(new Set((data ?? []).map((c) => c.fornecedor)));
}
