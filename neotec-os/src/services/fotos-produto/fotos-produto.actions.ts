"use server";

import { revalidatePath } from "next/cache";
import { uploadFotoProduto, removerFotoProduto, reordenarFotosProduto } from "./fotos-produto.service";
import type { ActionResult } from "@/types";

const EXTENSOES_ACEITAS = ["jpg", "jpeg", "png", "webp"];
const TAMANHO_MAXIMO_MB = 8;

export async function uploadFotoProdutoAction(formData: FormData): Promise<ActionResult<{ fotos: string[] }>> {
  try {
    const tabela = formData.get("tabela") as "produtos" | "aparelhos" | "catalogo_lacrados_modelos";
    const itemId = formData.get("itemId") as string;
    const arquivo = formData.get("arquivo") as File | null;

    if (!tabela || !itemId || !arquivo) return { success: false, error: "Dados incompletos" };
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return { success: false, error: `Foto muito grande — máximo ${TAMANHO_MAXIMO_MB}MB` };

    const extensao = (arquivo.name.split(".").pop() ?? "").toLowerCase();
    if (!EXTENSOES_ACEITAS.includes(extensao)) return { success: false, error: "Formato não aceito — use JPG, PNG ou WEBP" };

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const fotos = await uploadFotoProduto({ tabela, itemId, bytes, extensao });

    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: { fotos } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao subir foto" };
  }
}

export async function removerFotoProdutoAction(tabela: "produtos" | "aparelhos" | "catalogo_lacrados_modelos", itemId: string, url: string): Promise<ActionResult<{ fotos: string[] }>> {
  try {
    const fotos = await removerFotoProduto({ tabela, itemId, url });
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: { fotos } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao remover foto" };
  }
}

export async function reordenarFotosProdutoAction(tabela: "produtos" | "aparelhos" | "catalogo_lacrados_modelos", itemId: string, fotosOrdenadas: string[]): Promise<ActionResult> {
  try {
    await reordenarFotosProduto({ tabela, itemId, fotosOrdenadas });
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reordenar" };
  }
}
