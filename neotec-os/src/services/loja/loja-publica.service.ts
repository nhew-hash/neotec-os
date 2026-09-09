import { createClient } from "@/lib/supabase/server";
import type { ProdutoLoja, AparelhoDisponivelLoja } from "@/types";

/**
 * Catálogo público — roda no SERVIDOR (Server Component), não no
 * navegador. Isso é o que dá SEO de verdade pra loja: o crawler recebe
 * o HTML já com o produto renderizado, não uma página vazia esperando
 * JavaScript rodar. Passa pelas funções SECURITY DEFINER (Fase 58), que
 * já filtram só o que está publicado (`visivel_loja`) — funciona sem
 * sessão de usuário, o client de servidor não precisa de login pra
 * chamar uma função granted pra "anon".
 */
export async function listarProdutosLoja(): Promise<ProdutoLoja[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_produtos_loja");
  if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  return data ?? [];
}

export async function buscarProdutoLojaPorSlug(slug: string): Promise<ProdutoLoja | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buscar_produto_loja", { p_slug: slug });
  if (error) throw new Error(`Não foi possível carregar o produto: ${error.message}`);
  return data?.[0] ?? null;
}

export async function listarAparelhosDisponiveisLoja(produtoId: string): Promise<AparelhoDisponivelLoja[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_aparelhos_disponiveis_loja", { p_produto_id: produtoId });
  if (error) throw new Error(`Não foi possível carregar as unidades disponíveis: ${error.message}`);
  return data ?? [];
}
