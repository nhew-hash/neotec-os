import { createClient } from "@/lib/supabase/server";
import type { ReferenciaCriativa, StatusValidacaoCriativo } from "@/types";

/**
 * Central de Inteligência (Seção 12-14). Registro de referências
 * criativas e o "DNA" extraído delas. A BUSCA em si (Meta Ad Library,
 * YouTube, etc.) não está implementada aqui — depende de credenciais de
 * API que o projeto não tem ainda (mesma situação do Meta/Google Ads na
 * Fase 1). Esta tela/serviço cobre o que já é possível sem API externa:
 * registrar manualmente uma referência (própria ou achada por um
 * humano) e extrair o DNA dela com a IA (ver analisarDna, que usa o
 * Claude via ia.service.ts — nunca faz scraping).
 */
export async function listarReferencias(status?: StatusValidacaoCriativo): Promise<ReferenciaCriativa[]> {
  const supabase = await createClient();
  let query = supabase.from("referencias_criativas").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as referências: ${error.message}`);
  return data ?? [];
}

export async function criarReferencia(input: {
  origem: string;
  url_origem?: string;
  observacoes?: string;
}): Promise<ReferenciaCriativa> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("referencias_criativas")
    .insert({ origem: input.origem, url_origem: input.url_origem ?? null, observacoes: input.observacoes ?? null, created_by: user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar a referência: ${error.message}`);
  return data;
}

export async function atualizarStatusReferencia(id: string, status: StatusValidacaoCriativo): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("referencias_criativas").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o status: ${error.message}`);
}

/**
 * Extrai o DNA do criativo (Seção 14) a partir de uma descrição em texto
 * (o usuário descreve o que viu, ou cola a copy/roteiro de referência —
 * nunca baixa/reproduz a mídia de terceiro, só analisa o texto descrito).
 * Usa o Claude (via executarPromptIA) como camada de raciocínio, não
 * lógica hardcoded — Seção 46.
 */
export async function analisarDna(referenciaId: string, descricao: string): Promise<ReferenciaCriativa> {
  const { executarPromptIA } = await import("@/services/ia/ia.service");
  const resultado = await executarPromptIA({
    modulo: "neo_performance_creative",
    sistema:
      "Você analisa criativos de marketing e extrai o DNA estrutural deles. " +
      "Responda SOMENTE um JSON com as chaves: hook, assunto, formato, duracao_segundos, estrutura, cta, oferta, emocao, publico, produto, argumento, prova, estilo_visual, texto_identificado, ritmo, enquadramento. " +
      "Use null quando não for possível inferir. Nunca copie o texto literal do criativo — descreva o PADRÃO.",
    prompt: descricao,
    formatoJson: true,
  });

  const dna = JSON.parse(resultado.texto) as Partial<ReferenciaCriativa>;
  const supabase = await createClient();
  const { data, error } = await supabase.from("referencias_criativas").update(dna).eq("id", referenciaId).select("*").single();
  if (error) throw new Error(`Não foi possível salvar o DNA extraído: ${error.message}`);
  return data;
}
