"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function atualizarStatusLeadProstecAction(leadId: string, novoStatus: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: leadAtual } = await supabase.from("prostec_leads").select("status").eq("id", leadId).maybeSingle();

    const { error } = await supabase.from("prostec_leads").update({ status: novoStatus, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw new Error(error.message);

    await supabase.from("prostec_lead_status_history").insert({
      lead_id: leadId, from_status: leadAtual?.status ?? null, to_status: novoStatus, changed_by: user?.id ?? null,
    });

    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function adicionarNotaLeadAction(leadId: string, nota: string): Promise<ActionResult> {
  if (!nota.trim()) return { success: false, error: "Escreve alguma coisa" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_notes").insert({ lead_id: leadId, user_id: user?.id ?? null, note: nota.trim() });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar nota" };
  }
}

export async function registrarContatoLeadAction(leadId: string, contactType: string, result: string, notes: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_contacts").insert({
      lead_id: leadId, user_id: user?.id ?? null, contact_type: contactType, result, notes: notes.trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar contato" };
  }
}

export async function agendarFollowupLeadAction(leadId: string, data: string, hora: string, observacao: string): Promise<ActionResult> {
  if (!data) return { success: false, error: "Escolhe uma data" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_followups").insert({
      lead_id: leadId, user_id: user?.id ?? null, next_contact_date: data, next_contact_time: hora || null, observation: observacao.trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar follow-up" };
  }
}

export async function concluirFollowupLeadAction(followupId: string, leadId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_lead_followups").update({ done: true }).eq("id", followupId);
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao concluir follow-up" };
  }
}

export async function salvarConfiguracoesProstecAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_settings").update({
      score_quente_min: Number(formData.get("score_quente_min")),
      score_morno_min: Number(formData.get("score_morno_min")),
      raio_padrao_km: Number(formData.get("raio_padrao_km")),
      quantidade_padrao: Number(formData.get("quantidade_padrao")),
      comissao_pct_padrao: Number(formData.get("comissao_pct_padrao")),
      valor_venda_padrao: Number(formData.get("valor_venda_padrao")),
      segmentos_disponiveis: String(formData.get("segmentos_disponiveis") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      cidades_sugeridas: String(formData.get("cidades_sugeridas") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq("id", "default");
    if (error) throw new Error(error.message);
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configurações" };
  }
}
export async function registrarVendaProstecAction(leadId: string, product: string, amount: number, comissaoPct: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { data: venda, error: erroVenda } = await supabase
      .from("prostec_sales")
      .insert({ lead_id: leadId, user_id: user.id, product, amount })
      .select("id")
      .single();
    if (erroVenda) throw new Error(erroVenda.message);

    const valorComissao = Math.round(amount * (comissaoPct / 100) * 100) / 100;
    await supabase.from("prostec_commissions").insert({ sale_id: venda.id, user_id: user.id, pct: comissaoPct, amount: valorComissao });

    await supabase.from("prostec_leads").update({ status: "venda_fechada" }).eq("id", leadId);

    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar venda" };
  }
}

/** Cadastro manual de empresa (a busca automática ainda não está construída, só o schema pra ela). Já cria com um lead na etapa "novo" junto. */
export async function cadastrarEmpresaManualAction(formData: FormData): Promise<ActionResult<{ leadId: string }>> {
  const nome = String(formData.get("name") ?? "").trim();
  const cidade = String(formData.get("city") ?? "").trim();
  if (!nome) return { success: false, error: "Informe o nome da empresa" };
  if (!cidade) return { success: false, error: "Informe a cidade" };

  try {
    const supabase = await createClient();

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("prostec_companies")
      .insert({
        name: nome,
        category: String(formData.get("category") ?? "") || "outro",
        city: cidade,
        state: String(formData.get("state") ?? "") || "MG",
        phone: String(formData.get("phone") ?? "") || null,
        whatsapp: String(formData.get("whatsapp") ?? "") || null,
        website: String(formData.get("website") ?? "") || null,
        instagram: String(formData.get("instagram") ?? "") || null,
        source: "cadastro_manual",
        dedupe_key: `manual-${nome.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      })
      .select("id")
      .single();
    if (erroEmpresa) throw new Error(erroEmpresa.message);

    const { data: lead, error: erroLead } = await supabase
      .from("prostec_leads")
      .insert({
        company_id: empresa.id,
        segment: String(formData.get("category") ?? "") || "outro",
        score: 0,
        temperature: "frio",
        status: "novo",
        approach_suggestion: "Cadastrado manualmente — sem sugestão automática de abordagem.",
      })
      .select("id")
      .single();
    if (erroLead) throw new Error(erroLead.message);

    revalidatePath("/prostec/empresas");
    revalidatePath("/prostec");
    return { success: true, data: { leadId: lead.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar empresa" };
  }
}

/**
 * Motor de prospecção real — porta o Neotec Prospector original.
 * Busca no Google Places, analisa o site de cada empresa encontrada
 * (fetch real, nunca inventa dado), calcula pontuação, gera razões e
 * sugestão de abordagem, grava tudo. Evita duplicar empresa já
 * cadastrada (mesmo telefone/site/nome+cidade).
 *
 * ATENÇÃO DE PERFORMANCE: analisa o site de cada empresa uma por uma
 * (fetch real da página) — pode demorar bastante pra buscas grandes.
 * Recomendo começar com quantidade baixa (15-20) pra não esbarrar no
 * limite de tempo do Vercel.
 */
export async function executarBuscaProstecAction(formData: FormData): Promise<ActionResult<{ leadsCriados: number; leadsAtualizados: number; totalEncontrado: number }>> {
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 20);
  const segmentsRaw = String(formData.get("segments") ?? "");
  const segments = segmentsRaw ? segmentsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!city) return { success: false, error: "Informe a cidade" };
  if (!state) return { success: false, error: "Informe o estado (UF)" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { buscarEmpresasGooglePlaces, buildDedupeKey } = await import("./lib/google-places");
    const { analyzeSite } = await import("./lib/site-analyzer");
    const { computeScore, buildReasons, generateApproach } = await import("./lib/score-engine");
    const { SCORE_WEIGHTS_PADRAO, SEGMENTOS_ALTA_NECESSIDADE } = await import("./lib/settings-padrao");

    const { data: search, error: erroSearch } = await supabase
      .from("prostec_prospecting_searches")
      .insert({ city, state, radius_km: 50, segments, quantity_requested: quantity, status: "em_andamento", created_by: user?.id ?? null })
      .select("id")
      .single();
    if (erroSearch) throw new Error(erroSearch.message);

    let raw;
    try {
      raw = await buscarEmpresasGooglePlaces({ city, state, segments, quantity });
    } catch (err) {
      await supabase.from("prostec_prospecting_searches").update({ status: "erro" }).eq("id", search.id);
      throw err;
    }

    const { data: settingsRow } = await supabase.from("prostec_settings").select("*").eq("id", "default").maybeSingle();
    const weights = (settingsRow?.score_weights && Object.keys(settingsRow.score_weights).length > 0) ? settingsRow.score_weights : SCORE_WEIGHTS_PADRAO;
    const segmentosAltaNecessidade = settingsRow?.segmentos_alta_necessidade?.length ? settingsRow.segmentos_alta_necessidade : SEGMENTOS_ALTA_NECESSIDADE;
    const scoreQuenteMin = settingsRow?.score_quente_min ?? 80;
    const scoreMornoMin = settingsRow?.score_morno_min ?? 60;

    let criados = 0;
    let atualizados = 0;

    for (const rawCompany of raw) {
      const dedupeKey = buildDedupeKey(rawCompany);

      // Deduplicação — mesmo telefone, mesmo domínio de site, ou mesmo
      // nome+cidade já cadastrado antes vira UPDATE, não duplica.
      const { data: existentes } = await supabase.from("prostec_companies").select("id, phone, whatsapp, website, name, city, dedupe_key").eq("city", rawCompany.city);
      const duplicata = (existentes ?? []).find((e) =>
        e.dedupe_key === dedupeKey ||
        (rawCompany.phone && (e.phone === rawCompany.phone || e.whatsapp === rawCompany.phone)) ||
        (rawCompany.website && e.website === rawCompany.website) ||
        (e.name.toLowerCase() === rawCompany.name.toLowerCase() && e.city.toLowerCase() === rawCompany.city.toLowerCase())
      );

      const site = await analyzeSite(rawCompany.website, true);
      const scoreResult = computeScore(rawCompany, site, weights, segmentosAltaNecessidade, scoreQuenteMin, scoreMornoMin);
      const reasons = buildReasons(rawCompany, site, scoreResult.breakdown);
      const approach = generateApproach(rawCompany, site, "Ana");

      let companyId: string;
      if (duplicata) {
        companyId = duplicata.id;
        await supabase.from("prostec_companies").update({
          name: rawCompany.name, category: rawCompany.category, address: rawCompany.address,
          phone: rawCompany.phone, website: rawCompany.website, google_profile_url: rawCompany.google_profile_url,
          rating: rawCompany.rating, reviews_count: rawCompany.reviews_count, opening_hours: rawCompany.opening_hours,
          collected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", companyId);
      } else {
        const { data: novaEmpresa, error: erroEmpresa } = await supabase.from("prostec_companies").insert({
          name: rawCompany.name, category: rawCompany.category, city: rawCompany.city, state: rawCompany.state,
          address: rawCompany.address, phone: rawCompany.phone, website: rawCompany.website,
          google_profile_url: rawCompany.google_profile_url, rating: rawCompany.rating, reviews_count: rawCompany.reviews_count,
          opening_hours: rawCompany.opening_hours, source: rawCompany.source, dedupe_key: dedupeKey, is_demo_data: false,
        }).select("id").single();
        if (erroEmpresa) continue; // não trava a busca inteira por um erro pontual numa empresa
        companyId = novaEmpresa.id;
      }

      await supabase.from("prostec_lead_sources").insert({ company_id: companyId, search_id: search.id, source_name: rawCompany.source, source_ref: rawCompany.google_profile_url });

      const { data: leadExistente } = await supabase.from("prostec_leads").select("id").eq("company_id", companyId).maybeSingle();

      let leadId: string;
      if (leadExistente) {
        leadId = leadExistente.id;
        await supabase.from("prostec_leads").update({
          search_id: search.id, segment: rawCompany.category, score: scoreResult.score, temperature: scoreResult.temperature,
          site_analysis: site, reasons, approach_suggestion: approach, updated_at: new Date().toISOString(),
        }).eq("id", leadId);
        atualizados++;
      } else {
        const { data: novoLead } = await supabase.from("prostec_leads").insert({
          company_id: companyId, search_id: search.id, segment: rawCompany.category, score: scoreResult.score,
          temperature: scoreResult.temperature, status: "novo", site_analysis: site, reasons, approach_suggestion: approach,
        }).select("id").single();
        leadId = novoLead?.id ?? "";
        criados++;
      }

      if (leadId) {
        await supabase.from("prostec_lead_scores").insert({ lead_id: leadId, score: scoreResult.score, breakdown: scoreResult.breakdown, temperature: scoreResult.temperature });
      }
    }

    await supabase.from("prostec_prospecting_searches").update({ quantity_found: raw.length, status: "concluida" }).eq("id", search.id);

    revalidatePath("/prostec");
    revalidatePath("/prostec/empresas");
    return { success: true, data: { leadsCriados: criados, leadsAtualizados: atualizados, totalEncontrado: raw.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao executar busca" };
  }
}
