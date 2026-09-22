import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Um lead é duplicado se bater `gmaps_place_id`, `telefone_e164`,
 * domínio do site, ou (nome normalizado + cidade) — mesmo critério que
 * já existia embutido em `prostec.actions.ts` (Places API), agora com
 * o `gmaps_place_id` adicionado. Duplicado nunca é reinserido — só
 * completa campos vazios do registro existente.
 */

export interface EmpresaExistenteParaDedupe {
  id: string;
  name: string;
  city: string;
  telefone_e164: string | null;
  website: string | null;
  gmaps_place_id: string | null;
}

export interface LeadNormalizadoParaDedupe {
  nome: string;
  cidade: string;
  telefoneE164: string | null;
  website: string | null;
  gmapsPlaceId: string | null;
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function dominioDe(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function encontrarDuplicata(
  lead: LeadNormalizadoParaDedupe,
  candidatos: EmpresaExistenteParaDedupe[]
): EmpresaExistenteParaDedupe | null {
  const dominioLead = dominioDe(lead.website);
  const nomeNorm = normalizar(lead.nome);
  const cidadeNorm = normalizar(lead.cidade);

  return (
    candidatos.find((c) => {
      if (lead.gmapsPlaceId && c.gmaps_place_id && c.gmaps_place_id === lead.gmapsPlaceId) return true;
      if (lead.telefoneE164 && c.telefone_e164 && c.telefone_e164 === lead.telefoneE164) return true;
      if (dominioLead && dominioDe(c.website) === dominioLead) return true;
      if (normalizar(c.name) === nomeNorm && normalizar(c.city) === cidadeNorm) return true;
      return false;
    }) ?? null
  );
}

/** Busca candidatos a duplicata na mesma cidade — evita puxar a tabela inteira pra comparar em memória. */
export async function buscarCandidatosDedupe(
  supabase: SupabaseClient,
  cidade: string
): Promise<EmpresaExistenteParaDedupe[]> {
  const { data } = await supabase
    .from("prostec_companies")
    .select("id, name, city, telefone_e164, website, gmaps_place_id")
    .eq("city", cidade);
  return data ?? [];
}
