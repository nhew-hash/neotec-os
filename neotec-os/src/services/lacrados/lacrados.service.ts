import { createClient } from "@/lib/supabase/server";
import type { CatalogoLacradoModelo, CatalogoLacradoVariante } from "@/types";

export interface ModeloComVariantes extends CatalogoLacradoModelo {
  variantes: CatalogoLacradoVariante[];
}

export async function listarLacradosComVariantes(): Promise<ModeloComVariantes[]> {
  const supabase = await createClient();
  const [{ data: modelos, error: erroModelos }, { data: variantes }] = await Promise.all([
    supabase.from("catalogo_lacrados_modelos").select("*").order("ordem"),
    supabase.from("catalogo_lacrados_variantes").select("*"),
  ]);

  if (erroModelos) throw new Error(`Não foi possível carregar o catálogo: ${erroModelos.message}`);

  return (modelos ?? []).map((m) => ({
    ...m,
    variantes: (variantes ?? []).filter((v) => v.modelo_id === m.id),
  }));
}

export async function atualizarVarianteLacrado(id: string, input: { quantidade?: number; preco_venda?: number | null; ativo?: boolean }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogo_lacrados_variantes").update(input).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar a variante: ${error.message}`);
}
