/** Portado do Neotec Prospector original — pontuação configurável (0-100). */
import type { SiteAnalysis } from "./site-analyzer";
import type { ScoreWeights } from "./settings-padrao";

export interface RawCompanyParaScore {
  name: string; category: string; google_profile_url: string | null;
  reviews_count: number | null; rating: number | null; instagram: string | null;
  phone: string | null; whatsapp: string | null; opening_hours: string | null;
}

export interface ScoreBreakdownItem { key: string; label: string; points: number }
export interface ScoreResult { score: number; breakdown: ScoreBreakdownItem[]; temperature: "quente" | "morno" | "frio" }

export function computeScore(
  company: RawCompanyParaScore,
  site: SiteAnalysis,
  weights: ScoreWeights,
  segmentosAltaNecessidade: string[],
  scoreQuenteMin: number,
  scoreMornoMin: number
): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];

  if (!site.possui_site) {
    breakdown.push({ key: "sem_site", label: "Empresa não possui site", points: weights.sem_site });
  } else if (site.classificacao === "fraco") {
    breakdown.push({ key: "presenca_fraca", label: "Possui site, mas a presença digital é claramente fraca", points: weights.presenca_fraca });
  }

  if (company.google_profile_url) {
    breakdown.push({ key: "google_profile_ativo", label: "Possui Google Business Profile ativo", points: weights.google_profile_ativo });
  }

  if ((company.reviews_count ?? 0) >= weights.muitas_avaliacoes_threshold) {
    breakdown.push({ key: "muitas_avaliacoes", label: `Possui ${company.reviews_count} avaliações no Google`, points: weights.muitas_avaliacoes });
  }

  if (company.instagram) {
    breakdown.push({ key: "instagram_ativo", label: "Possui Instagram ativo", points: weights.instagram_ativo });
  }

  if (company.phone || company.whatsapp) {
    breakdown.push({ key: "telefone_whatsapp", label: "Possui telefone/WhatsApp para contato", points: weights.telefone_whatsapp });
  }

  const estabelecida = (company.reviews_count ?? 0) >= 15 || Boolean(company.opening_hours) || (company.rating ?? 0) >= 4;
  if (estabelecida) {
    breakdown.push({ key: "operacao_estabelecida", label: "Empresa aparenta ter operação estabelecida", points: weights.operacao_estabelecida });
  }

  if (segmentosAltaNecessidade.includes(company.category)) {
    breakdown.push({ key: "segmento_alta_necessidade", label: `Segmento "${company.category}" tem alta necessidade de presença digital`, points: weights.segmento_alta_necessidade });
  }

  const rawScore = breakdown.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  let temperature: "quente" | "morno" | "frio" = "frio";
  if (score >= scoreQuenteMin) temperature = "quente";
  else if (score >= scoreMornoMin) temperature = "morno";

  return { score, breakdown, temperature };
}

export function buildReasons(company: RawCompanyParaScore, site: SiteAnalysis, breakdown: ScoreBreakdownItem[]): string[] {
  const reasons: string[] = [];

  if (!site.possui_site) reasons.push("Empresa sem site próprio (Site não encontrado).");
  else if (site.classificacao === "fraco") reasons.push("Possui site, porém desatualizado/pouco funcional — oportunidade de reformulação.");

  if (company.google_profile_url) reasons.push("Possui Google Business Profile ativo.");
  if ((company.reviews_count ?? 0) > 0) reasons.push(`Possui ${company.reviews_count} avaliações no Google.`);
  if (company.instagram) reasons.push("Possui Instagram ativo.");
  if (company.whatsapp) reasons.push("Possui WhatsApp para contato direto.");
  else if (company.phone) reasons.push("Possui telefone para contato.");

  const hasBreakdown = (key: string) => breakdown.some((b) => b.key === key);
  if (hasBreakdown("operacao_estabelecida")) reasons.push("Empresa aparenta estar estabelecida na região.");
  if (hasBreakdown("segmento_alta_necessidade")) reasons.push(`Segmento "${company.category}" costuma converter bem em sites/landing pages.`);

  reasons.push(site.possui_site ? "Forte potencial para modernização de site e geração de leads." : "Forte potencial para criação de site institucional e geração de leads.");

  return reasons;
}

export function generateApproach(company: RawCompanyParaScore, site: SiteAnalysis, sellerName: string): string {
  const opening = `Olá, tudo bem? Falo com o responsável pela ${company.name}? Meu nome é ${sellerName}, sou da Neotec.`;
  const intro = "Nós trabalhamos com criação de sites para empresas da região.";

  let observation: string;
  if (!site.possui_site) {
    const signal = company.google_profile_url ? "vocês têm uma presença forte no Google" : company.instagram ? "vocês têm uma boa presença no Instagram" : "vocês têm uma boa reputação na região";
    observation = `Eu encontrei a empresa de vocês pesquisando ${company.category.toLowerCase()} na região e percebi que ${signal}, mas não encontrei um site próprio.`;
  } else if (site.classificacao === "fraco") {
    observation = "Eu encontrei o site de vocês, mas percebi que ele está um pouco desatualizado e pode não estar convertendo visitantes em clientes como poderia.";
  } else {
    observation = `Eu encontrei a empresa de vocês pesquisando ${company.category.toLowerCase()} na região e vi que vocês têm uma presença bem interessante online.`;
  }

  const closing = "Posso te explicar rapidamente uma oportunidade que identificamos?";
  return `"${opening} ${intro} ${observation} ${closing}"`;
}
