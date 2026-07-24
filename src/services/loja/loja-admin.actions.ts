"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function publicarProdutoLojaAction(input: {
  produtoId: string;
  visivel: boolean;
  descricaoLoja: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    let slug: string | undefined;
    if (input.visivel) {
      const { data: produto } = await supabase.from("produtos").select("nome, slug").eq("id", input.produtoId).maybeSingle();
      if (!produto) return { success: false, error: "Produto não encontrado" };
      // Só gera slug novo se ainda não tiver um — publicar de novo não muda a URL.
      slug = produto.slug ?? `${gerarSlug(produto.nome)}-${input.produtoId.slice(0, 6)}`;
    }

    const { error } = await supabase
      .from("produtos")
      .update({
        visivel_loja: input.visivel,
        descricao_loja: input.descricaoLoja || null,
        ...(slug ? { slug } : {}),
      })
      .eq("id", input.produtoId);

    if (error) throw new Error(error.message);

    revalidatePath("/estoque");
    revalidatePath("/loja");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao publicar" };
  }
}
