import "server-only";

/**
 * Cliente HTTP do gateway do prostec-scraper (Caddy na frente do
 * gosom/google-maps-scraper, ver infra/prostec-scraper/README.md).
 * Nunca fala direto com o scraper — sempre passa pelo gateway, que
 * exige X-Api-Key.
 */

export interface JobScraperPayload {
  name: string;
  keywords: string[];
  lang: string;
  zoom: number;
  lat: string;
  lon: string;
  fast_mode: boolean;
  radius: number;
  depth: number;
  email: boolean;
  max_time: number;
}

export interface JobScraperCriado {
  id: string;
}

/** Valores reais confirmados na v1.15.0. "working"/"ok" tratados como sinônimo de processando/concluído por segurança. */
export type StatusJobScraper = "pending" | "working" | "ok" | "failed" | string;

export interface StatusJobScraperResposta {
  id: string;
  status: StatusJobScraper;
}

export class ScraperError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ScraperError";
  }
}

function baseUrl(): string {
  const url = process.env.PROSTEC_SCRAPER_URL;
  if (!url) throw new ScraperError("PROSTEC_SCRAPER_URL não configurada nas variáveis de ambiente.");
  return url.replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.PROSTEC_SCRAPER_API_KEY;
  if (!key) throw new ScraperError("PROSTEC_SCRAPER_API_KEY não configurada nas variáveis de ambiente.");
  return key;
}

async function comRetry<T>(tentativa: () => Promise<T>, tentativas = 3): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await tentativa();
    } catch (err) {
      ultimoErro = err;
      // Só vale a pena tentar de novo em erro de rede/timeout ou 5xx —
      // erro 4xx (ex: chave errada, job não existe) não muda tentando de novo.
      if (err instanceof ScraperError && err.status && err.status < 500) throw err;
      if (i < tentativas - 1) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
    }
  }
  throw ultimoErro;
}

async function fetchComTimeout(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...init.headers, "X-Api-Key": apiKey() },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/v1/jobs — também serve de health check (lista, mesmo vazia, quando está tudo certo). */
export async function health(): Promise<{ ok: boolean; detalhe?: string }> {
  try {
    const res = await fetchComTimeout("/api/v1/jobs", { method: "GET" }, 8000);
    if (!res.ok) return { ok: false, detalhe: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detalhe: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

/** POST /api/v1/jobs — cria um job novo. Nunca deixa mais de um job "no ar" (isso é responsabilidade de quem chama, ver orquestracao). */
export async function criarJob(payload: JobScraperPayload): Promise<JobScraperCriado> {
  return comRetry(async () => {
    const res = await fetchComTimeout(
      "/api/v1/jobs",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      15000
    );
    if (!res.ok) throw new ScraperError(`Falha ao criar job no scraper (HTTP ${res.status})`, res.status);
    const json = (await res.json()) as JobScraperCriado;
    if (!json?.id) throw new ScraperError("Scraper não devolveu o id do job criado");
    return json;
  });
}

/** GET /api/v1/jobs/{id} — status atual do job. */
export async function statusJob(id: string): Promise<StatusJobScraperResposta> {
  return comRetry(async () => {
    const res = await fetchComTimeout(`/api/v1/jobs/${id}`, { method: "GET" }, 10000);
    if (!res.ok) throw new ScraperError(`Falha ao consultar status do job (HTTP ${res.status})`, res.status);
    // A v1.15.0 do gosom devolve os campos com inicial maiúscula ("ID",
    // "Status") — normaliza aqui pra quem chama sempre receber id/status.
    const json = (await res.json()) as Record<string, unknown>;
    const status = String(json.status ?? json.Status ?? "").toLowerCase();
    return { id: String(json.id ?? json.ID ?? id), status };
  });
}

/** GET /api/v1/jobs/{id}/download — CSV bruto com os resultados. Timeout generoso (busca grande = CSV grande). */
export async function baixarCsv(id: string): Promise<string> {
  return comRetry(async () => {
    const res = await fetchComTimeout(`/api/v1/jobs/${id}/download`, { method: "GET" }, 120_000);
    if (!res.ok) throw new ScraperError(`Falha ao baixar CSV do job (HTTP ${res.status})`, res.status);
    return await res.text();
  }, 2);
}
