import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CatalogoFoto } from "@/types";

const BUCKET = "catalogo-fotos";

export function urlPublicaFotoCatalogo(caminho: string): string {
  // Bucket público de propósito (diferente de whatsapp-media) — URL
  // estável, não expira, o Bridge precisa conseguir buscar a qualquer
  // momento sem depender de gerar link toda vez.
  const supabase = createAdminClient();
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

/** Upload e gestão ficam com sessão de usuário — RLS restringe a admin/gerente/vendedor, decisão deliberada (não é a IA que cadastra foto nova, só usa o que já existe). */
export async function uploadFotoCatalogo(descricao: string, bytes: Buffer, extensao: string, usuarioId: string): Promise<CatalogoFoto> {
  const supabase = await createClient();
  const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, bytes, { upsert: false });
  if (erroUpload) throw new Error(`Não foi possível salvar a foto: ${erroUpload.message}`);

  const { data, error } = await supabase
    .from("catalogo_fotos")
    .insert({ descricao, caminho_storage: caminho, usuario_id: usuarioId })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível cadastrar a foto no catálogo: ${error.message}`);
  return data;
}

export async function listarFotosCatalogo(): Promise<CatalogoFoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("catalogo_fotos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  return data ?? [];
}

export async function removerFotoCatalogo(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: foto } = await supabase.from("catalogo_fotos").select("caminho_storage").eq("id", id).maybeSingle();
  if (foto) await supabase.storage.from(BUCKET).remove([foto.caminho_storage]);
  const { error } = await supabase.from("catalogo_fotos").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover a foto: ${error.message}`);
}

/**
 * Busca usada tanto pelo seletor manual no chat (com sessão) quanto pela
 * IA de Atendimento (sem sessão, webhook) — por isso Service Role.
 * Busca simples por substring na descrição (ex: "13 preto" acha
 * "iPhone 13 Preto Seminovo") — não precisa de nada mais sofisticado
 * pro volume de fotos que um catálogo desses costuma ter.
 */
export async function buscarFotosCatalogo(termo: string): Promise<CatalogoFoto[]> {
  const supabase = createAdminClient();
  const palavras = termo.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];

  let query = supabase.from("catalogo_fotos").select("*");
  palavras.forEach((palavra) => {
    query = query.ilike("descricao", `%${palavra}%`);
  });

  const { data, error } = await query.limit(5);
  if (error) throw new Error(`Não foi possível buscar no catálogo: ${error.message}`);
  return data ?? [];
}
