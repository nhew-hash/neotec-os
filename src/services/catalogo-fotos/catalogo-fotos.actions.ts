"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoCatalogo, removerFotoCatalogo } from "./catalogo-fotos.service";
import type { ActionResult } from "@/types";

export async function uploadFotoCatalogoAction(formData: FormData): Promise<ActionResult> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const arquivo = formData.get("foto") as File | null;

  if (!descricao) return { success: false, error: "Descreva a foto (ex: iPhone 13 Preto Seminovo)" };
  if (!arquivo) return { success: false, error: "Selecione uma foto" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const extensao = arquivo.type.split("/")[1] ?? "jpg";
    await uploadFotoCatalogo(descricao, bytes, extensao, user.id);

    revalidatePath("/catalogo-fotos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar foto" };
  }
}

export async function removerFotoCatalogoAction(id: string): Promise<ActionResult> {
  try {
    await removerFotoCatalogo(id);
    revalidatePath("/catalogo-fotos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover" };
  }
}

export async function buscarFotosCatalogoAction(termo: string) {
  const { buscarFotosCatalogo, urlPublicaFotoCatalogo } = await import("./catalogo-fotos.service");
  if (!termo.trim()) return { success: true as const, data: [] };
  try {
    const fotos = await buscarFotosCatalogo(termo);
    return {
      success: true as const,
      data: fotos.map((f) => ({ id: f.id, descricao: f.descricao, url: urlPublicaFotoCatalogo(f.caminho_storage) })),
    };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Erro na busca" };
  }
}
