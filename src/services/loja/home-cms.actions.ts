"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  criarHeroSlide, atualizarHeroSlide, removerHeroSlide, reordenarHeroSlides,
  criarHomeSecao, atualizarHomeSecao, removerHomeSecao, reordenarHomeSecoes,
} from "./home-cms.service";
import type { ActionResult, HeroSlide, HomeSecao, TipoSecaoHome } from "@/types";

function handleErro(err: unknown, fallback: string): ActionResult {
  return { success: false, error: err instanceof Error ? err.message : fallback };
}

// ---- Hero Slides ----

export async function criarHeroSlideAction(): Promise<ActionResult<{ id: string }>> {
  try {
    const slide = await criarHeroSlide({});
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: { id: slide.id } };
  } catch (err) {
    return handleErro(err, "Erro ao criar slide") as ActionResult<{ id: string }>;
  }
}

export async function atualizarHeroSlideAction(id: string, input: Partial<HeroSlide>): Promise<ActionResult> {
  try {
    await atualizarHeroSlide(id, input);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return handleErro(err, "Erro ao salvar slide");
  }
}

export async function removerHeroSlideAction(id: string): Promise<ActionResult> {
  try {
    await removerHeroSlide(id);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return handleErro(err, "Erro ao remover slide");
  }
}

export async function reordenarHeroSlidesAction(ordemIds: string[]): Promise<ActionResult> {
  try {
    await reordenarHeroSlides(ordemIds);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return handleErro(err, "Erro ao reordenar");
  }
}

/** Upload de imagem do slide (desktop ou mobile) — bucket público, URL fixa (não expira, precisa carregar rápido na home). */
export async function uploadImagemHeroAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const arquivo = formData.get("arquivo") as File | null;
    if (!arquivo) return { success: false, error: "Nenhum arquivo enviado" };

    const supabase = await createClient();
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const extensao = arquivo.type.split("/")[1] ?? "jpg";
    const caminho = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

    const { error } = await supabase.storage.from("loja-cms").upload(caminho, bytes, { contentType: arquivo.type });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("loja-cms").getPublicUrl(caminho);
    return { success: true, data: { url: data.publicUrl } };
  } catch (err) {
    return handleErro(err, "Erro ao enviar imagem") as ActionResult<{ url: string }>;
  }
}

// ---- Seções da Home ----

export async function criarHomeSecaoAction(tipo: TipoSecaoHome): Promise<ActionResult<{ id: string }>> {
  try {
    const secao = await criarHomeSecao(tipo);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: { id: secao.id } };
  } catch (err) {
    return handleErro(err, "Erro ao criar seção") as ActionResult<{ id: string }>;
  }
}

export async function atualizarHomeSecaoAction(id: string, input: Partial<Pick<HomeSecao, "ativo" | "configuracao" | "data_inicio" | "data_fim">>): Promise<ActionResult> {
  try {
    await atualizarHomeSecao(id, input);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return handleErro(err, "Erro ao salvar seção");
  }
}

export async function removerHomeSecaoAction(id: string): Promise<ActionResult> {
  try {
    await removerHomeSecao(id);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return handleErro(err, "Erro ao remover seção");
  }
}

export async function reordenarHomeSecoesAction(ordemIds: string[]): Promise<ActionResult> {
  try {
    await reordenarHomeSecoes(ordemIds);
    revalidatePath("/configuracoes/loja-cms");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return handleErro(err, "Erro ao reordenar");
  }
}
