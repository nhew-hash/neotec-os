"use server";

import { revalidatePath } from "next/cache";
import { identificarPasta, type IdentificacaoPasta } from "./banco-imagens-ia.service";
import { buscarGrupoExistente, importarPastaImagens, type GrupoImagem } from "./banco-imagens.service";
import type { ActionResult } from "@/types";

export async function identificarPastaAction(nomePasta: string): Promise<ActionResult<{ identificacao: IdentificacaoPasta; grupoExistente: GrupoImagem | null }>> {
  try {
    const identificacao = await identificarPasta(nomePasta);
    const grupoExistente = await buscarGrupoExistente(identificacao);
    return { success: true, data: { identificacao, grupoExistente } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao identificar a pasta" };
  }
}

export async function importarPastaImagensAction(formData: FormData): Promise<ActionResult<{ grupoId: string; produtosVinculados: number }>> {
  try {
    const identificacao: IdentificacaoPasta = JSON.parse(formData.get("identificacao") as string);
    const substituir = formData.get("substituir") === "true";
    const arquivosRaw = formData.getAll("arquivos") as File[];

    if (arquivosRaw.length === 0) return { success: false, error: "Nenhum arquivo recebido" };

    const arquivos = await Promise.all(
      arquivosRaw.map(async (a) => ({
        bytes: Buffer.from(await a.arrayBuffer()),
        extensao: (a.name.split(".").pop() ?? "jpg").toLowerCase(),
        nomeOriginal: a.name,
      }))
    );

    const resultado = await importarPastaImagens({ identificacao, arquivos, substituir });

    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao importar a pasta" };
  }
}
