"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { identificarPasta, type IdentificacaoPasta } from "./banco-imagens-ia.service";
import {
  buscarGrupoExistente,
  importarPastaImagens,
  revincularTudo,
  listarGrupos,
  listarCategoriasDistintas,
  obterDetalheGrupo,
  atualizarEquivalentesGrupo,
  reordenarFotosGrupo,
  vincularManualmente,
  mesclarGruposAntigos,
  type GrupoImagem,
  type RelatorioVinculacao,
  type RelatorioMesclagem,
  type GrupoListado,
  type FiltrosGrupos,
  type DetalheGrupo,
} from "./banco-imagens.service";
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

export async function revincularTudoAction(forcar = false): Promise<ActionResult<RelatorioVinculacao>> {
  try {
    const resultado = await revincularTudo({ forcar });
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao revincular" };
  }
}

export async function listarGruposAction(filtros: FiltrosGrupos = {}): Promise<ActionResult<GrupoListado[]>> {
  try {
    return { success: true, data: await listarGrupos(filtros) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar grupos" };
  }
}

export async function listarCategoriasAction(): Promise<ActionResult<string[]>> {
  try {
    return { success: true, data: await listarCategoriasDistintas() };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar categorias" };
  }
}

export async function obterDetalheGrupoAction(grupoId: string): Promise<ActionResult<DetalheGrupo | null>> {
  try {
    return { success: true, data: await obterDetalheGrupo(grupoId) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar o grupo" };
  }
}

export async function atualizarEquivalentesAction(grupoId: string, coresEquivalentes: string[], modelosEquivalentes: string[]): Promise<ActionResult<null>> {
  try {
    await atualizarEquivalentesGrupo(grupoId, coresEquivalentes, modelosEquivalentes);
    revalidatePath("/estoque");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function reordenarFotosAction(grupoId: string, ordemFotoIds: string[]): Promise<ActionResult<null>> {
  try {
    await reordenarFotosGrupo(grupoId, ordemFotoIds);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reordenar" };
  }
}

export async function listarPendenciasAction(): Promise<ActionResult<Pick<RelatorioVinculacao, "ambiguos" | "semGrupo">>> {
  try {
    const relatorio = await revincularTudo({ dryRun: true });
    return { success: true, data: { ambiguos: relatorio.ambiguos, semGrupo: relatorio.semGrupo } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar pendências" };
  }
}

export async function vincularManualmenteAction(tipo: "produto" | "aparelho" | "lacrado", id: string, grupoId: string): Promise<ActionResult<null>> {
  try {
    await vincularManualmente(tipo, id, grupoId);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao vincular" };
  }
}

// Fase 249, problema 1: grupos criados antes da importação em lote (sem
// origem_id, cor simplificada) competem com os grupos novos equivalentes.
// `dryRun: true` só calcula o que SERIA mesclado, pra mostrar uma prévia
// antes do usuário confirmar.
export async function mesclarGruposAntigosAction(dryRun = true): Promise<ActionResult<RelatorioMesclagem>> {
  try {
    const supabase = await createClient();
    const resultado = await mesclarGruposAntigos(supabase, dryRun);
    if (!dryRun) {
      revalidatePath("/estoque");
      revalidatePath("/loja", "layout");
    }
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao mesclar grupos antigos" };
  }
}
