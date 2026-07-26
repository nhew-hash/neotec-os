"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { classificarItensFornecedor, type ItemFornecedorExtraido } from "./central-fornecedor-ia.service";
import { listarRegrasLucro, calcularPrecoComRegra } from "./regras-lucro.service";
import { listarLacradosComVariantes } from "@/services/lacrados/lacrados.service";
import type { ActionResult } from "@/types";

export interface ItemFornecedorClassificado extends ItemFornecedorExtraido {
  /** Só preenchido pra itens "seminovo" — preço de venda já calculado com a regra de lucro padrão aplicada sobre o preço pago (item.preco). */
  precoVendaSugerido: number | null;
  lucroSugerido: number | null;
}

/** Classifica com IA e já aplica a regra de lucro padrão nos itens de seminovo — antes esse cálculo só existia na tela separada de cadastro de seminovo, faltava aqui. */
export async function classificarFornecedorAction(texto: string): Promise<ActionResult<{ itens: ItemFornecedorClassificado[] }>> {
  try {
    const [itensExtraidos, regras] = await Promise.all([classificarItensFornecedor(texto), listarRegrasLucro()]);
    const regraPadrao = regras.find((r) => r.padrao) ?? regras[0];

    const itens: ItemFornecedorClassificado[] = itensExtraidos.map((item) => {
      if (item.destino !== "seminovo" || !regraPadrao) return { ...item, precoVendaSugerido: null, lucroSugerido: null };
      const { precoVenda, lucro } = calcularPrecoComRegra(item.preco, regraPadrao);
      return { ...item, precoVendaSugerido: precoVenda, lucroSugerido: lucro };
    });

    return { success: true, data: { itens } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao classificar" };
  }
}

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Item classificado como "seminovo" — salva como aparelho de verdade.
 * IMEI é OPCIONAL (Fase 87): em cadastro em lote via lista de
 * fornecedor, o IMEI muitas vezes só é conhecido quando o aparelho
 * chega fisicamente na loja — dá pra completar depois, editando o
 * aparelho no Estoque.
 */
export async function aplicarSeminovoFornecedorAction(item: {
  modelo: string; memoria: string | null; cor: string | null; bateria: number | null;
  observacoes: string | null; precoPago: number; precoVenda: number; imei: string;
}): Promise<ActionResult<{ aparelhoId: string }>> {
  try {
    const supabase = await createClient();

    let { data: produto } = await supabase.from("produtos").select("id").eq("nome", item.modelo).maybeSingle();
    if (!produto) {
      const { data: novoProduto, error: erroProduto } = await supabase
        .from("produtos")
        .insert({ nome: item.modelo, categoria: item.modelo.toLowerCase().includes("iphone") ? "iphone" : "android", marca: item.modelo.toLowerCase().includes("iphone") ? "Apple" : null })
        .select("id").single();
      if (erroProduto) throw new Error(erroProduto.message);
      produto = novoProduto;
    }

    const { data: aparelho, error } = await supabase
      .from("aparelhos")
      .insert({
        produto_id: produto.id, imei: item.imei.trim() || null, memoria: item.memoria, cor: item.cor, bateria: item.bateria,
        condicao: "seminovo", custo: item.precoPago, preco_venda: item.precoVenda, observacoes: item.observacoes,
        origem_entrada: "fornecedor", status: "disponivel",
      })
      .select("id").single();

    if (error) {
      if (error.code === "23505") throw new Error("Já existe um aparelho cadastrado com esse IMEI");
      throw new Error(error.message);
    }

    revalidatePath("/estoque");
    return { success: true, data: { aparelhoId: aparelho.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

/** Item classificado como "lacrado" — casa com o catálogo mestre já existente (Fase 66), atualiza quantidade/preço. */
export async function aplicarLacradoFornecedorAction(item: { modelo: string; memoria: string | null; cor: string | null; preco: number }): Promise<ActionResult> {
  try {
    const catalogo = await listarLacradosComVariantes();
    const modeloEncontrado = catalogo.find((m) => normalizarTexto(m.nome) === normalizarTexto(item.modelo));
    if (!modeloEncontrado) return { success: false, error: `Modelo "${item.modelo}" não encontrado no catálogo mestre de lacrados` };

    const variante = modeloEncontrado.variantes.find(
      (v) => normalizarTexto(v.armazenamento) === normalizarTexto(item.memoria ?? "") && normalizarTexto(v.cor).includes(normalizarTexto(item.cor ?? ""))
    );
    if (!variante) return { success: false, error: `Variante ${item.memoria ?? "?"} ${item.cor ?? "?"} não encontrada pra esse modelo` };

    const supabase = await createClient();
    const { error } = await supabase.from("catalogo_lacrados_variantes").update({ preco_venda: item.preco, quantidade: 1 }).eq("id", variante.id);
    if (error) throw new Error(error.message);

    revalidatePath("/estoque/lacrados");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar lacrado" };
  }
}

/** Item classificado como "generico" (iPad, MacBook, Apple Watch, acessório, JBL etc) — cria/atualiza um produto simples. */
export async function aplicarGenericoFornecedorAction(item: {
  modelo: string; categoria: string; marca: string | null; observacoes: string | null; preco: number;
}): Promise<ActionResult<{ produtoId: string }>> {
  try {
    const supabase = await createClient();
    const { data: existente } = await supabase.from("produtos").select("id").eq("nome", item.modelo).maybeSingle();

    if (existente) {
      const { error } = await supabase.from("produtos").update({ preco_venda: item.preco, descricao: item.observacoes }).eq("id", existente.id);
      if (error) throw new Error(error.message);
      revalidatePath("/estoque");
      return { success: true, data: { produtoId: existente.id } };
    }

    const { data: novo, error } = await supabase
      .from("produtos")
      .insert({ nome: item.modelo, categoria: item.categoria, marca: item.marca, preco_venda: item.preco, descricao: item.observacoes })
      .select("id").single();
    if (error) throw new Error(error.message);

    revalidatePath("/estoque");
    return { success: true, data: { produtoId: novo.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar produto" };
  }
}
