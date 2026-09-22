import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const csvFixture = readFileSync(join(__dirname, "../__fixtures__/gmaps-scraper-exemplo.csv"), "utf-8");

vi.mock("@/services/prostec/scraper/scraper.client", () => ({
  baixarCsv: vi.fn(async () => csvFixture),
}));

/**
 * Mock mínimo do query builder do Supabase — mesma estratégia do teste
 * da máquina de estados do cron (fila ordenada de respostas, uma por
 * "cadeia" de chamada, resolvida tanto por `.single()`/`.maybeSingle()`
 * explícito quanto por `await` direto no builder via protocolo thenable).
 */
function makeSupabaseMock(respostas: Array<{ data?: unknown; error?: unknown }>) {
  let i = 0;
  const proxima = () => respostas[i] !== undefined ? respostas[i++] : { data: null, error: null };
  function builder(): any {
    const obj: any = {
      select: () => obj,
      update: () => obj,
      insert: () => obj,
      eq: () => obj,
      not: () => obj,
      is: () => obj,
      order: () => obj,
      limit: () => obj,
      maybeSingle: () => Promise.resolve(proxima()),
      single: () => Promise.resolve(proxima()),
      then: (resolve: (v: unknown) => void) => resolve(proxima()),
    };
    return obj;
  }
  return { from: () => builder() } as any;
}

let supabaseMockAtual: any;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMockAtual,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("importarJobService", () => {
  it("importa o CSV: normaliza, ignora empresa fechada, ignora empresa que já tem site, cria empresa+lead+score só pra quem não tem site", async () => {
    const job = { id: "job-1", cidade: "Araguari", uf: "MG", nicho: "Comércio local", job_externo_id: "ext-1" };

    supabaseMockAtual = makeSupabaseMock([
      { data: job, error: null }, // 1. select do job
      { data: null, error: null }, // 2. prostec_settings (usa defaults)
      { data: [], error: null }, // 3. candidatos de dedupe (nenhum ainda)
      // Padaria do João (tem telefone válido -> checa opt-out; TEM site -> ignorada, não vira lead)
      { data: null, error: null }, // 4. opt-out (não está)
      // Oficina Central (tem telefone válido -> checa opt-out; TEM site -> ignorada, não vira lead)
      { data: null, error: null }, // 5. opt-out (não está)
      // Salão da Maria (sem telefone -> não checa opt-out; SEM site -> vira lead)
      { data: { id: "company-3" }, error: null }, // 6. insert prostec_companies
      { data: { id: "lead-3" }, error: null }, // 7. insert prostec_leads
      { data: null, error: null }, // 8. insert prostec_lead_scores
      // Loja Fechada Ltda (CLOSED_PERMANENTLY) é pulada antes de qualquer query
      { data: null, error: null }, // 9. update final de contadores do job
    ]);

    const { importarJobService } = await import("../importar-job.service");
    const resultado = await importarJobService("job-1");

    // 4 linhas no CSV: 1 fechada (não conta pro pipeline), 2 já têm site
    // (empresa com site não é lead viável pra Prostec — ver Fase 232),
    // só Salão da Maria (sem site) vira lead novo de verdade.
    expect(resultado.totalEncontrados).toBe(4);
    expect(resultado.totalNovos).toBe(1);
    expect(resultado.totalDuplicados).toBe(0);
    expect(resultado.totalBloqueadosOptout).toBe(0);
    expect(resultado.totalIgnoradosPossuiSite).toBe(2);
  });

  it("bloqueia lead cujo telefone está em opt-out e não conta como novo", async () => {
    const job = { id: "job-2", cidade: "Araguari", uf: "MG", nicho: "Comércio local", job_externo_id: "ext-2" };
    const csvSoComTelefone = "title,phone,business_status\nPadaria do João,(34) 99999-8888,OPERATIONAL\n";

    const { baixarCsv } = await import("../scraper.client");
    (baixarCsv as any).mockResolvedValueOnce(csvSoComTelefone);

    supabaseMockAtual = makeSupabaseMock([
      { data: job, error: null }, // select do job
      { data: null, error: null }, // settings
      { data: [], error: null }, // candidatos dedupe
      { data: { telefone: "5534999998888" }, error: null }, // opt-out ENCONTRADO
      { data: null, error: null }, // update final de contadores
    ]);

    const { importarJobService } = await import("../importar-job.service");
    const resultado = await importarJobService("job-2");

    expect(resultado.totalBloqueadosOptout).toBe(1);
    expect(resultado.totalNovos).toBe(0);
  });
});
