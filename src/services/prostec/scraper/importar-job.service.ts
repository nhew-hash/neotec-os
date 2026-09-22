import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { baixarCsv } from "./scraper.client";
import { parseCsvScraper, type LeadBruto } from "./csv-parser";
import { normalizarTelefoneE164BR, normalizarSite, normalizarEmails, normalizarTexto } from "./normalizacao";
import { encontrarDuplicata, buscarCandidatosDedupe, type LeadNormalizadoParaDedupe } from "./deduplicacao";
import { estaEmOptOut } from "./opt-out";
import { analyzeSite, type SiteAnalysis } from "@/services/prostec/lib/site-analyzer";
import { computeScore, buildReasons, generateApproach, type RawCompanyParaScore } from "@/services/prostec/lib/score-engine";
import { SCORE_WEIGHTS_PADRAO, SEGMENTOS_ALTA_NECESSIDADE, type ScoreWeights } from "@/services/prostec/lib/settings-padrao";

/**
 * Orquestra: baixar CSV → parse → normalizar → checar opt-out →
 * deduplicar → inserir em lote → disparar o scoring engine existente
 * → colocar na primeira etapa do pipeline → atualizar contadores do
 * job. Site analysis "de verdade" (fetch do HTML, redes sociais) NÃO
 * roda aqui — roda depois, em lote, por `enriquecerLotePendente`
 * (Fase 4.3 do prompt: evita estourar o timeout da Vercel importando
 * uma busca de 100+ empresas). O score inicial usa um "stub" neutro
 * (site analisado = pendente) e é recalculado quando a análise real
 * do site termina.
 */

function siteAnalysisPendente(website: string | null, now: string): SiteAnalysis {
  return {
    possui_site: Boolean(website),
    site_confiavel: true,
    acessivel: null, https: null, responsivo: null, aparencia_moderna: null,
    velocidade_aproximada: null, botao_whatsapp: null, formulario_contato: null,
    informacoes_empresa: null, cta_claro: null, pagina_servicos: null, seo_basico: null,
    data_atualizacao_aparente: null,
    // "inexistente" é o valor neutro mais seguro pro score não pontuar
    // indevidamente "site fraco" nem "site excelente" antes da análise
    // de verdade rodar — vira `null`-ish, só não pontua nada específico.
    classificacao: website ? "fraco" : "inexistente",
    analisado_em: now,
    instagram_encontrado: null, whatsapp_encontrado: null, facebook_encontrado: null, linkedin_encontrado: null, emails_encontrados: [],
  };
}

async function carregarConfigScore(supabase: ReturnType<typeof createAdminClient>) {
  const { data: settingsRow } = await supabase.from("prostec_settings").select("*").eq("id", "default").maybeSingle();
  const weights: ScoreWeights = settingsRow?.score_weights && Object.keys(settingsRow.score_weights).length > 0 ? settingsRow.score_weights : SCORE_WEIGHTS_PADRAO;
  const segmentosAltaNecessidade: string[] = settingsRow?.segmentos_alta_necessidade?.length ? settingsRow.segmentos_alta_necessidade : SEGMENTOS_ALTA_NECESSIDADE;
  const scoreQuenteMin: number = settingsRow?.score_quente_min ?? 80;
  const scoreMornoMin: number = settingsRow?.score_morno_min ?? 60;
  return { weights, segmentosAltaNecessidade, scoreQuenteMin, scoreMornoMin };
}

export interface ResultadoImportacao {
  totalEncontrados: number;
  totalNovos: number;
  totalDuplicados: number;
  totalBloqueadosOptout: number;
}

export async function importarJobService(jobId: string): Promise<ResultadoImportacao> {
  const supabase = createAdminClient();

  const { data: job, error: erroJob } = await supabase.from("prostec_scrape_jobs").select("*").eq("id", jobId).single();
  if (erroJob || !job) throw new Error(`Job de scraping não encontrado: ${erroJob?.message ?? jobId}`);
  if (!job.job_externo_id) throw new Error("Job sem job_externo_id — não tem CSV pra baixar ainda.");

  const csv = await baixarCsv(job.job_externo_id);
  const leadsBrutos = parseCsvScraper(csv);

  const { weights, segmentosAltaNecessidade, scoreQuenteMin, scoreMornoMin } = await carregarConfigScore(supabase);

  // Candidatos a duplicata só da mesma cidade — carregado uma vez só
  // pro job inteiro, não por lead (evita N+1).
  const candidatos = await buscarCandidatosDedupe(supabase, job.cidade);

  let novos = 0;
  let duplicados = 0;
  let bloqueadosOptout = 0;
  const now = new Date().toISOString();

  for (const bruto of leadsBrutos) {
    const telefoneE164 = normalizarTelefoneE164BR(bruto.telefone);
    const website = normalizarSite(bruto.website);
    const emails = normalizarEmails(bruto.emails);
    const nome = normalizarTexto(bruto.titulo) ?? "Empresa sem nome no Google Maps";
    const categoria = normalizarTexto(bruto.categoria) ?? job.nicho;
    const endereco = normalizarTexto(bruto.endereco);
    const horarios = normalizarTexto(bruto.horarios);

    if (bruto.status && bruto.status.toUpperCase() !== "OPERATIONAL" && bruto.status.toLowerCase() !== "operacional") {
      // Empresa fechada/inativa no Google — não vale a pena prospectar.
      continue;
    }

    if (telefoneE164 && (await estaEmOptOut(supabase, telefoneE164))) {
      bloqueadosOptout++;
      continue;
    }

    const leadParaDedupe: LeadNormalizadoParaDedupe = { nome, cidade: job.cidade, telefoneE164, website, gmapsPlaceId: bruto.placeId };
    const duplicata = encontrarDuplicata(leadParaDedupe, candidatos);

    const camposComuns = {
      name: nome, category: categoria, address: endereco, phone: bruto.telefone ? normalizarTexto(bruto.telefone) : null,
      website, google_profile_url: bruto.link, gmaps_place_id: bruto.placeId, gmaps_cid: bruto.cid, gmaps_link: bruto.link,
      rating: bruto.nota, reviews_count: bruto.totalAvaliacoes, opening_hours: horarios,
      telefone_e164: telefoneE164, emails, scrape_job_id: job.id,
      collected_at: now, updated_at: now,
    };

    let companyId: string;
    if (duplicata) {
      duplicados++;
      companyId = duplicata.id;
      // Enriquecimento não-destrutivo: só completa o que faltava, nunca
      // apaga um dado que já existia (ex: instagram achado manualmente).
      const { data: atual } = await supabase.from("prostec_companies").select("*").eq("id", companyId).single();
      await supabase.from("prostec_companies").update({
        name: atual.name || camposComuns.name,
        category: atual.category || camposComuns.category,
        address: atual.address ?? camposComuns.address,
        phone: atual.phone ?? camposComuns.phone,
        website: atual.website ?? camposComuns.website,
        google_profile_url: atual.google_profile_url ?? camposComuns.google_profile_url,
        gmaps_place_id: atual.gmaps_place_id ?? camposComuns.gmaps_place_id,
        gmaps_cid: atual.gmaps_cid ?? camposComuns.gmaps_cid,
        gmaps_link: atual.gmaps_link ?? camposComuns.gmaps_link,
        rating: camposComuns.rating ?? atual.rating,
        reviews_count: camposComuns.reviews_count ?? atual.reviews_count,
        opening_hours: atual.opening_hours ?? camposComuns.opening_hours,
        telefone_e164: atual.telefone_e164 ?? camposComuns.telefone_e164,
        emails: Array.from(new Set([...(atual.emails ?? []), ...camposComuns.emails])),
        updated_at: now,
      }).eq("id", companyId);
    } else {
      const siteStub = siteAnalysisPendente(website, now);
      const rawParaScore: RawCompanyParaScore = {
        name: nome, category: categoria, google_profile_url: bruto.link, reviews_count: bruto.totalAvaliacoes,
        rating: bruto.nota, instagram: null, phone: bruto.telefone, whatsapp: null, opening_hours: horarios,
      };
      const scoreResult = computeScore(rawParaScore, siteStub, weights, segmentosAltaNecessidade, scoreQuenteMin, scoreMornoMin);
      const reasons = buildReasons(rawParaScore, siteStub, scoreResult.breakdown);
      const approach = generateApproach(rawParaScore, siteStub, "Ana");

      const dedupeKey = [nome, telefoneE164 ?? "", website ?? "", job.cidade].join("|").toLowerCase();

      const { data: novaEmpresa, error: erroEmpresa } = await supabase.from("prostec_companies").insert({
        ...camposComuns,
        city: job.cidade, state: job.uf ?? "", source: "Google Maps (scraper próprio)", origem: "gmaps_scraper",
        dedupe_key: dedupeKey, is_demo_data: false,
      }).select("id").single();
      if (erroEmpresa || !novaEmpresa) continue; // não trava o job inteiro por uma empresa com erro pontual
      companyId = novaEmpresa.id;
      candidatos.push({ id: companyId, name: nome, city: job.cidade, telefone_e164: telefoneE164, website, gmaps_place_id: bruto.placeId });

      const { data: novoLead } = await supabase.from("prostec_leads").insert({
        company_id: companyId, segment: categoria, score: scoreResult.score, temperature: scoreResult.temperature,
        status: "novo", site_analysis: siteStub, reasons, approach_suggestion: approach,
      }).select("id").single();

      if (novoLead?.id) {
        await supabase.from("prostec_lead_scores").insert({ lead_id: novoLead.id, score: scoreResult.score, breakdown: scoreResult.breakdown, temperature: scoreResult.temperature });
      }

      novos++;
      // Fase 7 — leads do scraper NÃO recebem disparo automático da
      // Iara só por terem sido importados (diferente do fluxo antigo
      // da Places API). Ver docs/prostec/scraper-migracao.md.
    }
  }

  await supabase.from("prostec_scrape_jobs").update({
    total_encontrados: leadsBrutos.length, total_novos: novos, total_duplicados: duplicados, total_bloqueados_optout: bloqueadosOptout,
  }).eq("id", jobId);

  return { totalEncontrados: leadsBrutos.length, totalNovos: novos, totalDuplicados: duplicados, totalBloqueadosOptout: bloqueadosOptout };
}

/**
 * Roda a análise real do site (fetch + redes sociais + score
 * definitivo) em lote, pros leads do scraper que ainda não foram
 * enriquecidos — chamado pelo cron, nunca no meio da importação (ver
 * comentário no topo do arquivo).
 */
export async function enriquecerLotePendente(limite = 40): Promise<{ processados: number }> {
  const supabase = createAdminClient();

  const { data: pendentes } = await supabase
    .from("prostec_companies")
    .select("id, name, category, website, google_profile_url, reviews_count, rating, phone, whatsapp, opening_hours, instagram, facebook, linkedin, emails")
    .eq("origem", "gmaps_scraper")
    .not("website", "is", null)
    .is("enriquecido_em", null)
    .limit(limite);

  if (!pendentes?.length) return { processados: 0 };

  const { weights, segmentosAltaNecessidade, scoreQuenteMin, scoreMornoMin } = await carregarConfigScore(supabase);
  const now = new Date().toISOString();

  // Concorrência limitada (5 por vez) — não sobrecarrega nem a Vercel
  // nem os sites de terceiros sendo visitados.
  const CONCORRENCIA = 5;
  for (let i = 0; i < pendentes.length; i += CONCORRENCIA) {
    const lote = pendentes.slice(i, i + CONCORRENCIA);
    await Promise.all(lote.map(async (empresa) => {
      const site = await analyzeSite(empresa.website, true);

      const instagram = site.instagram_encontrado ?? empresa.instagram;
      const facebook = site.facebook_encontrado ?? empresa.facebook;
      const linkedin = site.linkedin_encontrado ?? empresa.linkedin;
      const emails = Array.from(new Set([...(empresa.emails ?? []), ...normalizarEmails(site.emails_encontrados)]));

      const rawParaScore: RawCompanyParaScore = {
        name: empresa.name, category: empresa.category, google_profile_url: empresa.google_profile_url,
        reviews_count: empresa.reviews_count, rating: empresa.rating, instagram, phone: empresa.phone,
        whatsapp: site.whatsapp_encontrado ?? empresa.whatsapp, opening_hours: empresa.opening_hours,
      };
      const scoreResult = computeScore(rawParaScore, site, weights, segmentosAltaNecessidade, scoreQuenteMin, scoreMornoMin);
      const reasons = buildReasons(rawParaScore, site, scoreResult.breakdown);
      const approach = generateApproach(rawParaScore, site, "Ana");

      await supabase.from("prostec_companies").update({
        instagram, facebook, linkedin, emails, whatsapp: rawParaScore.whatsapp, enriquecido_em: now, updated_at: now,
      }).eq("id", empresa.id);

      const { data: lead } = await supabase.from("prostec_leads").select("id").eq("company_id", empresa.id).maybeSingle();
      if (lead?.id) {
        await supabase.from("prostec_leads").update({
          score: scoreResult.score, temperature: scoreResult.temperature, site_analysis: site, reasons, approach_suggestion: approach, updated_at: now,
        }).eq("id", lead.id);
        await supabase.from("prostec_lead_scores").insert({ lead_id: lead.id, score: scoreResult.score, breakdown: scoreResult.breakdown, temperature: scoreResult.temperature });
      }
    }));
  }

  return { processados: pendentes.length };
}

// Reexportado só pra o teste de unidade conseguir bater o parser sem duplicar o import.
export type { LeadBruto };
