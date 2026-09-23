"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listarRegrasLucro, type RegraLucroComFaixas } from "@/services/seminovos/regras-lucro.service";
import type { ActionResult } from "@/types";

export interface CategoriaFolha {
  slug: string;
  nome: string;
  nomePai: string | null;
}

export interface MargemCategoria {
  id: string;
  categoria_slug: string;
  condicao: string; // '' = qualquer condição
  valor_fixo: number | null;
  percentual: number | null;
  regra_lucro_id: string | null;
}

/** Só as folhas da árvore (categoria com pai) — os 9 "baldes" de topo (Smartphones, Tablets...) não recebem regra direta, só as folhas. */
export async function listarCategoriasFolhaAction(): Promise<ActionResult<{ categorias: CategoriaFolha[] }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("import_categorias").select("slug, nome, ordem, parent:import_categorias!parent_id(nome)").not("parent_id", "is", null).order("ordem");
    if (error) throw new Error(error.message);

    const categorias: CategoriaFolha[] = (data ?? []).map((c) => ({
      slug: c.slug,
      nome: c.nome,
      nomePai: (c.parent as unknown as { nome: string } | null)?.nome ?? null,
    }));
    return { success: true, data: { categorias } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar categorias" };
  }
}

export async function listarRegrasLucroParaSelecaoAction(): Promise<ActionResult<{ regras: RegraLucroComFaixas[] }>> {
  try {
    const regras = await listarRegrasLucro();
    return { success: true, data: { regras } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar regras de lucro" };
  }
}

export async function listarMargensCategoriaAction(): Promise<ActionResult<{ margens: MargemCategoria[] }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("import_margem_categoria").select("id, categoria_slug, condicao, valor_fixo, percentual, regra_lucro_id").order("categoria_slug");
    if (error) throw new Error(error.message);
    return { success: true, data: { margens: (data ?? []) as MargemCategoria[] } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar margens" };
  }
}

export async function salvarMargemCategoriaAction(input: {
  categoriaSlug: string;
  condicao: "" | "Lacrado" | "Seminovo";
  modo: "regra" | "fixo" | "percentual";
  regraLucroId?: string;
  valorFixo?: number;
  percentual?: number;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const linha = {
      categoria_slug: input.categoriaSlug,
      condicao: input.condicao,
      regra_lucro_id: input.modo === "regra" ? input.regraLucroId ?? null : null,
      valor_fixo: input.modo === "fixo" ? input.valorFixo ?? null : null,
      percentual: input.modo === "percentual" ? input.percentual ?? null : null,
    };
    const { error } = await supabase.from("import_margem_categoria").upsert(linha, { onConflict: "categoria_slug,condicao" });
    if (error) throw new Error(error.message);

    revalidatePath("/estoque/importacao-fornecedores");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar margem" };
  }
}

export async function removerMargemCategoriaAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("import_margem_categoria").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/estoque/importacao-fornecedores");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover margem" };
  }
}
