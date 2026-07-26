"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  listarRegrasLucro, criarRegraLucro, removerRegraLucro, definirRegraPadrao, calcularPrecoComRegra,
} from "./regras-lucro.service";
import { extrairDadosSeminovo, type DadosSeminovoExtraidos } from "./seminovo-ia.service";
import type { ActionResult, TipoRegraLucro } from "@/types";

export async function criarRegraLucroAction(input: {
  nome: string; tipo: TipoRegraLucro; valorFixo?: number; percentual?: number;
  faixas?: { valorAte: number | null; lucro: number }[];
}): Promise<ActionResult> {
  try {
    await criarRegraLucro(input);
    revalidatePath("/estoque/seminovos/regras-lucro");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar regra" };
  }
}

export async function removerRegraLucroAction(id: string): Promise<ActionResult> {
  try {
    await removerRegraLucro(id);
    revalidatePath("/estoque/seminovos/regras-lucro");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover" };
  }
}

export async function definirRegraPadraoAction(id: string): Promise<ActionResult> {
  try {
    await definirRegraPadrao(id);
    revalidatePath("/estoque/seminovos/regras-lucro");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao definir padrão" };
  }
}

export interface ItemSeminovoRevisao extends DadosSeminovoExtraidos {
  precoVendaCalculado: number | null;
  lucroCalculado: number | null;
}

/** Extrai com IA + já aplica a regra de lucro padrão (ou a informada) — devolve tudo pra revisão antes de salvar qualquer coisa de verdade. */
export async function extrairEcalcularSeminovoAction(texto: string, regraId?: string): Promise<ActionResult<{ itens: ItemSeminovoRevisao[]; regraUsadaId: string | null }>> {
  try {
    const [itensExtraidos, regras] = await Promise.all([extrairDadosSeminovo(texto), listarRegrasLucro()]);
    const regra = regraId ? regras.find((r) => r.id === regraId) : regras.find((r) => r.padrao) ?? regras[0];

    const itens: ItemSeminovoRevisao[] = itensExtraidos.map((item) => {
      if (!regra || item.precoPago == null) return { ...item, precoVendaCalculado: null, lucroCalculado: null };
      const { precoVenda, lucro } = calcularPrecoComRegra(item.precoPago, regra);
      return { ...item, precoVendaCalculado: precoVenda, lucroCalculado: lucro };
    });

    return { success: true, data: { itens, regraUsadaId: regra?.id ?? null } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao processar" };
  }
}

/** Salva de verdade — só chamado depois da equipe revisar os dados extraídos na tela. Acha ou cria um produto genérico (marca/modelo) pra vincular o aparelho. */
export async function salvarSeminovoRevisadoAction(item: {
  modelo: string; memoria: string | null; cor: string | null; bateria: number | null;
  telaOriginal: boolean | null; faceIdOk: boolean | null; trueToneOk: boolean | null;
  pecasSubstituidas: string[]; observacoes: string | null;
  precoPago: number; precoVenda: number; imei: string;
}): Promise<ActionResult<{ aparelhoId: string }>> {
  if (!item.imei.trim()) return { success: false, error: "IMEI é obrigatório" };

  try {
    const supabase = await createClient();

    let { data: produto } = await supabase.from("produtos").select("id").eq("nome", item.modelo).maybeSingle();
    if (!produto) {
      const { data: novoProduto, error: erroProduto } = await supabase
        .from("produtos")
        .insert({ nome: item.modelo, categoria: item.modelo.toLowerCase().includes("iphone") ? "iphone" : "android", marca: item.modelo.toLowerCase().includes("iphone") ? "Apple" : null })
        .select("id")
        .single();
      if (erroProduto) throw new Error(erroProduto.message);
      produto = novoProduto;
    }

    const { data: aparelho, error } = await supabase
      .from("aparelhos")
      .insert({
        produto_id: produto.id,
        imei: item.imei.trim(),
        memoria: item.memoria,
        cor: item.cor,
        bateria: item.bateria,
        condicao: "seminovo",
        custo: item.precoPago,
        preco_venda: item.precoVenda,
        tela_original: item.telaOriginal,
        face_id_ok: item.faceIdOk,
        true_tone_ok: item.trueToneOk,
        pecas_substituidas: item.pecasSubstituidas,
        observacoes: item.observacoes,
        origem_entrada: "fornecedor",
        status: "disponivel",
      })
      .select("id")
      .single();

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
