"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodificar } from "./geocode.service";
import type { ActionResult } from "@/types";

/**
 * Server Actions da aba Captação. Permissão segue o padrão do projeto
 * (RLS nas tabelas — `prostec_scrape_jobs_staff`, ver migration Fase
 * 229) em vez de checagem manual de cargo aqui dentro.
 */

export interface NovaBuscaInput {
  nichos: string[];
  cidade: string;
  uf?: string;
  depth?: number;
  buscarEmail?: boolean;
  buscarRedes?: boolean;
}

const DEPTH_PADRAO = Number(process.env.PROSTEC_SCRAPER_DEFAULT_DEPTH ?? 5);

export async function criarBuscaAction(input: NovaBuscaInput): Promise<ActionResult<{ ids: string[] }>> {
  const nichos = input.nichos.map((n) => n.trim()).filter(Boolean);
  const cidade = input.cidade.trim();
  if (!cidade) return { success: false, error: "Informe a cidade" };
  if (nichos.length === 0) return { success: false, error: "Informe pelo menos um nicho" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const coords = await geocodificar(cidade, input.uf);
    if (!coords) {
      return { success: false, error: `Não consegui localizar "${cidade}${input.uf ? `, ${input.uf}` : ""}" no mapa — confere o nome da cidade.` };
    }

    const linhas = nichos.map((nicho) => ({
      nicho,
      cidade,
      uf: input.uf?.trim() || null,
      query: `${nicho} em ${cidade}${input.uf ? `, ${input.uf}` : ""}`,
      lat: coords.lat,
      lon: coords.lon,
      depth: input.depth ?? DEPTH_PADRAO,
      buscar_email: input.buscarEmail ?? false,
      buscar_redes: input.buscarRedes ?? true,
      status: "fila" as const,
      criado_por: user?.id ?? null,
    }));

    const { data, error } = await supabase.from("prostec_scrape_jobs").insert(linhas).select("id");
    if (error) throw new Error(error.message);

    revalidatePath("/prostec/captacao");
    return { success: true, data: { ids: (data ?? []).map((r) => r.id) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar busca" };
  }
}

export async function cancelarBuscaAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    // Só cancela se ainda não terminou — não faz sentido "cancelar" um
    // job já concluído ou já com erro definitivo.
    const { error } = await supabase.from("prostec_scrape_jobs")
      .update({ status: "cancelado", finalizado_em: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["fila", "enviado", "processando"]);
    if (error) throw new Error(error.message);
    revalidatePath("/prostec/captacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cancelar busca" };
  }
}

export async function reprocessarBuscaAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_scrape_jobs")
      .update({ status: "fila", erro: null, tentativas: 0, job_externo_id: null, iniciado_em: null, finalizado_em: null })
      .eq("id", id)
      .in("status", ["erro", "cancelado"]);
    if (error) throw new Error(error.message);
    revalidatePath("/prostec/captacao");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reprocessar busca" };
  }
}

export async function importarNovamenteAction(id: string): Promise<ActionResult<{ totalNovos: number; totalDuplicados: number }>> {
  try {
    const supabase = await createClient();
    const { data: job } = await supabase.from("prostec_scrape_jobs").select("status, job_externo_id").eq("id", id).maybeSingle();
    if (!job?.job_externo_id || job.status !== "concluido") {
      return { success: false, error: "Só é possível reimportar uma busca já concluída." };
    }
    const { importarJobService } = await import("./importar-job.service");
    const resultado = await importarJobService(id);
    revalidatePath("/prostec/captacao");
    return { success: true, data: { totalNovos: resultado.totalNovos, totalDuplicados: resultado.totalDuplicados } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reimportar busca" };
  }
}

export async function listarBuscasAction(): Promise<ActionResult<Array<Record<string, unknown>>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("prostec_scrape_jobs").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar buscas" };
  }
}

export async function listarLeadsDaBuscaAction(scrapeJobId: string): Promise<ActionResult<Array<Record<string, unknown>>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prostec_companies")
      .select("id, name, phone, whatsapp, website, instagram, rating, reviews_count, prostec_leads(id, score, temperature, status)")
      .eq("scrape_job_id", scrapeJobId);
    if (error) throw new Error(error.message);
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar leads da busca" };
  }
}
