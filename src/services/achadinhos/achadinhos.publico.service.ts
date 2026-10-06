import { createClient } from "@supabase/supabase-js";
import type { ProdutoPublico } from "@/lib/achadinhos/tipos";

/**
 * Fase 263 — leitura PÚBLICA do catálogo. Usa o client anônimo SEM cookies
 * (assim as páginas podem ser estáticas/ISR) e lê só a VIEW
 * `achadinhos_produtos_publicos`: produtos ativos e não excluídos, sem link
 * de afiliado cru, sem comissão/receita/custo. O visitante anônimo nem tem
 * acesso à tabela de produtos.
 *
 * Erros PROPAGAM de propósito: numa regeneração (ISR) que falha, o Next
 * mantém a última versão boa em vez de publicar um catálogo vazio.
 */

const VIEW = "achadinhos_produtos_publicos";

function clientePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ordem do catálogo: destaques primeiro, depois a `ordem` definida no painel, depois os mais novos. */
function ordenar<T extends { order: (col: string, o: { ascending: boolean }) => T }>(q: T): T {
  return q.order("destaque", { ascending: false }).order("ordem", { ascending: true }).order("created_at", { ascending: false });
}

export async function listarCatalogoPublico(limite = 300): Promise<ProdutoPublico[]> {
  const { data, error } = await ordenar(clientePublico().from(VIEW).select("*")).limit(limite);
  if (error) throw new Error(`Achadinhos: falha ao listar catálogo (${error.message})`);
  return (data ?? []) as ProdutoPublico[];
}

export async function buscarProdutoPublico(slug: string): Promise<ProdutoPublico | null> {
  const { data, error } = await clientePublico().from(VIEW).select("*").eq("slug", slug).limit(1).maybeSingle();
  if (error) throw new Error(`Achadinhos: falha ao buscar produto (${error.message})`);
  return (data as ProdutoPublico | null) ?? null;
}

/** Outros produtos da mesma categoria (ou, sem categoria, os mais recentes). */
export async function listarRelacionadosPublico(produto: Pick<ProdutoPublico, "id" | "categoria">, quantidade = 4): Promise<ProdutoPublico[]> {
  let q = clientePublico().from(VIEW).select("*").neq("id", produto.id);
  if (produto.categoria) q = q.eq("categoria", produto.categoria);
  const { data, error } = await ordenar(q).limit(quantidade);
  if (error) throw new Error(`Achadinhos: falha ao buscar relacionados (${error.message})`);
  return (data ?? []) as ProdutoPublico[];
}

/** Categorias presentes no catálogo, em ordem alfabética, sem repetir (nem variar caixa). */
export function categoriasDoCatalogo(produtos: Pick<ProdutoPublico, "categoria">[]): string[] {
  const vistas = new Map<string, string>();
  for (const p of produtos) {
    const c = p.categoria?.trim();
    if (c && !vistas.has(c.toLowerCase())) vistas.set(c.toLowerCase(), c);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function listarParaSitemap(): Promise<{ slug: string; updated_at: string }[]> {
  const { data, error } = await clientePublico().from(VIEW).select("slug, updated_at").order("updated_at", { ascending: false }).limit(5000);
  if (error) throw new Error(`Achadinhos: falha ao listar sitemap (${error.message})`);
  return (data ?? []) as { slug: string; updated_at: string }[];
}
