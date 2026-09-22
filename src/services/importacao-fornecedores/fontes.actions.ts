"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export interface FonteImportacao {
  id: string;
  fornecedor: string;
  grupo_id: string | null;
  nome_grupo: string | null;
  autores_permitidos: string[];
  aceita_encaminhada: boolean;
  ativo: boolean;
  created_at: string;
}

export interface ExecucaoImportacao {
  id: string;
  fornecedor: string;
  tipo_lista: string;
  aplicado: boolean;
  travada_por_seguranca: boolean;
  motivo_trava: string | null;
  resumo_whatsapp: string | null;
  created_at: string;
}

/** Lista todas as fontes, incluindo rascunhos (grupos vistos mas ainda não configurados) — rascunho primeiro, pra chamar atenção. */
export async function listarFontesAction(): Promise<ActionResult<{ fontes: FonteImportacao[] }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("import_fontes").select("*").order("ativo", { ascending: true }).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, data: { fontes: (data ?? []) as FonteImportacao[] } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar fontes" };
  }
}

export async function atualizarFonteAction(
  id: string,
  input: { fornecedor: string; ativo: boolean; nomeGrupo?: string | null; autoresPermitidos?: string[] }
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const update: Record<string, unknown> = { fornecedor: input.fornecedor, ativo: input.ativo };
    if (input.nomeGrupo !== undefined) update.nome_grupo = input.nomeGrupo;
    if (input.autoresPermitidos !== undefined) update.autores_permitidos = input.autoresPermitidos;

    const { error } = await supabase.from("import_fontes").update(update).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/estoque/importacao-fornecedores");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar fonte" };
  }
}

/** Cadastro manual — pra quando você já sabe o JID do grupo (ex: copiou de outro lugar) e não quer esperar a primeira mensagem chegar pra virar rascunho. */
export async function criarFonteAction(input: { fornecedor: string; grupoId: string; nomeGrupo?: string }): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("import_fontes").insert({
      fornecedor: input.fornecedor,
      grupo_id: input.grupoId,
      nome_grupo: input.nomeGrupo ?? null,
      ativo: true,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/estoque/importacao-fornecedores");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar fonte" };
  }
}

export async function listarExecucoesRecentesAction(limite = 20): Promise<ActionResult<{ execucoes: ExecucaoImportacao[] }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("import_execucoes")
      .select("id, fornecedor, tipo_lista, aplicado, travada_por_seguranca, motivo_trava, resumo_whatsapp, created_at")
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) throw new Error(error.message);
    return { success: true, data: { execucoes: (data ?? []) as ExecucaoImportacao[] } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar execuções" };
  }
}
