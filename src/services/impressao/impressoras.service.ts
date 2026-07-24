import { createClient } from "@/lib/supabase/server";
import type { Impressora, ImpressoraDocumentoPreferencia, TipoDocumentoImpressao } from "@/types";
import type { ImpressoraFormValues } from "./impressoras.schema";

export async function listarImpressoras(): Promise<Impressora[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("impressoras").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar as impressoras: ${error.message}`);
  return data ?? [];
}

export async function criarImpressora(dados: ImpressoraFormValues): Promise<Impressora> {
  const supabase = await createClient();

  // Se marcou como padrão, tira o padrão de qualquer outra do mesmo tipo antes.
  if (dados.padrao) {
    await supabase.from("impressoras").update({ padrao: false }).eq("tipo", dados.tipo);
  }

  const { data, error } = await supabase
    .from("impressoras")
    .insert({ nome: dados.nome, tipo: dados.tipo, driver: dados.driver || null, padrao: dados.padrao })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível cadastrar a impressora: ${error.message}`);
  return data;
}

export async function removerImpressora(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("impressoras").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover a impressora: ${error.message}`);
}

export async function alternarStatusImpressora(id: string, status: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("impressoras").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o status: ${error.message}`);
}

/**
 * Preferência de impressora por documento — usuarioId null = padrão da
 * loja inteira. NÃO usa upsert com ON CONFLICT aqui de propósito: no
 * Postgres, NULL nunca é considerado igual a NULL numa constraint
 * única, então duas chamadas seguidas com usuarioId=null criariam duas
 * linhas em vez de atualizar a mesma — busca manual evita essa armadilha.
 */
export async function definirPreferenciaImpressora(
  tipoDocumento: TipoDocumentoImpressao,
  impressoraId: string,
  usuarioId: string | null
): Promise<void> {
  const supabase = await createClient();

  let query = supabase.from("impressora_documento_preferencia").select("id").eq("tipo_documento", tipoDocumento);
  query = usuarioId === null ? query.is("usuario_id", null) : query.eq("usuario_id", usuarioId);
  const { data: existente } = await query.maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("impressora_documento_preferencia")
      .update({ impressora_id: impressoraId })
      .eq("id", existente.id);
    if (error) throw new Error(`Não foi possível atualizar a preferência: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from("impressora_documento_preferencia")
    .insert({ tipo_documento: tipoDocumento, impressora_id: impressoraId, usuario_id: usuarioId });
  if (error) throw new Error(`Não foi possível salvar a preferência: ${error.message}`);
}

export interface PreferenciasCompletas {
  impressoras: Impressora[];
  preferenciasLoja: ImpressoraDocumentoPreferencia[];
  preferenciasUsuario: ImpressoraDocumentoPreferencia[];
}

export async function buscarPreferenciasCompletas(usuarioId: string): Promise<PreferenciasCompletas> {
  const supabase = await createClient();
  const [{ data: impressoras }, { data: preferencias }] = await Promise.all([
    supabase.from("impressoras").select("*").order("nome"),
    supabase.from("impressora_documento_preferencia").select("*"),
  ]);

  return {
    impressoras: impressoras ?? [],
    preferenciasLoja: (preferencias ?? []).filter((p) => p.usuario_id === null),
    preferenciasUsuario: (preferencias ?? []).filter((p) => p.usuario_id === usuarioId),
  };
}
