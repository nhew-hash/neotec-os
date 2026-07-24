import { createClient } from "@/lib/supabase/server";
import type { CatalogoLacradoModelo, CatalogoLacradoVariante } from "@/types";

/** Só modelo com pelo menos 1 variante em estoque aparece — filtro já embutido na função SQL (Fase 66). */
export async function listarLacradosModelosPublico(): Promise<Pick<CatalogoLacradoModelo, "id" | "nome" | "marca">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_lacrados_modelos_publico");
  if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  return (data ?? []) as Pick<CatalogoLacradoModelo, "id" | "nome" | "marca">[];
}

export async function buscarLacradoModeloPorNome(nomeSlug: string): Promise<Pick<CatalogoLacradoModelo, "id" | "nome" | "marca"> | null> {
  const modelos = await listarLacradosModelosPublico();
  return modelos.find((m) => slugify(m.nome) === nomeSlug) ?? null;
}

export async function listarLacradosVariantesPublico(modeloId: string): Promise<Pick<CatalogoLacradoVariante, "id" | "cor" | "armazenamento" | "quantidade" | "preco_venda">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_lacrados_variantes_publico", { p_modelo_id: modeloId });
  if (error) throw new Error(`Não foi possível carregar as opções: ${error.message}`);
  return (data ?? []) as Pick<CatalogoLacradoVariante, "id" | "cor" | "armazenamento" | "quantidade" | "preco_venda">[];
}

/**
 * Modelo de lacrado não tem `slug` salvo no banco (só o de produto
 * genérico tem, Fase 43) — a URL usa o nome convertido na hora, já que
 * o catálogo mestre é fixo (29 modelos conhecidos), não editável em
 * texto livre pelo lojista.
 */
export function slugify(nome: string): string {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
