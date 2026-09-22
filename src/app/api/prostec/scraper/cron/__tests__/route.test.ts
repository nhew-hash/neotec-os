import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks precisam vir antes do import do módulo testado (hoisting do vitest).
vi.mock("@/services/prostec/scraper/scraper.client", () => ({
  criarJob: vi.fn(),
  statusJob: vi.fn(),
}));
vi.mock("@/services/prostec/scraper/importar-job.service", () => ({
  importarJobService: vi.fn(),
  enriquecerLotePendente: vi.fn(async () => ({ processados: 0 })),
}));

import { processarJobEmAndamento, tratarFalha, enviarProximoDaFila } from "../route";
import { criarJob, statusJob } from "@/services/prostec/scraper/scraper.client";
import { importarJobService } from "@/services/prostec/scraper/importar-job.service";

/**
 * Mock mínimo do query builder do Supabase — cada chamada a `.from(...)`
 * abre uma "cadeia" nova que resolve com a próxima resposta da fila,
 * seja via `.maybeSingle()`/`.single()` explícito, seja via `await`
 * direto no builder (protocolo thenable), que é como o código de
 * produção usa em updates sem select de volta.
 */
function makeSupabaseMock(respostas: Array<{ data?: unknown; error?: unknown }>) {
  let i = 0;
  const proxima = () => respostas[i++] ?? { data: null, error: null };
  function builder(): any {
    const obj: any = {
      select: () => obj,
      update: () => obj,
      insert: () => obj,
      eq: () => obj,
      in: () => obj,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tratarFalha", () => {
  it("volta pro estado 'fila' quando ainda não bateu o limite de tentativas", async () => {
    const supabase = makeSupabaseMock([{ data: null, error: null }]);
    const resultado = await tratarFalha(supabase, { id: "job-1", tentativas: 0 }, "erro de teste");
    expect(resultado).toMatchObject({ id: "job-1", status: "fila", tentativa: 1 });
  });

  it("marca como 'erro' definitivo depois de esgotar as tentativas (MAX_TENTATIVAS = 2)", async () => {
    const supabase = makeSupabaseMock([{ data: null, error: null }]);
    const resultado = await tratarFalha(supabase, { id: "job-1", tentativas: 2 }, "erro de teste");
    expect(resultado).toMatchObject({ id: "job-1", status: "erro" });
  });
});

describe("enviarProximoDaFila", () => {
  it("retorna null quando não há nada na fila", async () => {
    const supabase = makeSupabaseMock([{ data: null, error: null }]);
    const resultado = await enviarProximoDaFila(supabase);
    expect(resultado).toBeNull();
  });

  it("reserva o job (update condicional) e cria no scraper", async () => {
    const proximo = { id: "job-2", query: "restaurantes em Araguari", lat: -18.6, lon: -48.1, raio_m: 10000, depth: 5, buscar_email: false };
    const supabase = makeSupabaseMock([
      { data: proximo, error: null }, // select do próximo da fila
      { data: { id: "job-2" }, error: null }, // update condicional (reserva) bem-sucedido
      { data: null, error: null }, // update do job_externo_id
    ]);
    (criarJob as any).mockResolvedValue({ id: "ext-123" });

    const resultado = await enviarProximoDaFila(supabase);
    expect(criarJob).toHaveBeenCalledWith(expect.objectContaining({ keywords: ["restaurantes em Araguari"] }));
    expect(resultado).toMatchObject({ id: "job-2", status: "enviado", jobExternoId: "ext-123" });
  });

  it("retorna null se outra execução do cron já reservou o job (corrida evitada)", async () => {
    const proximo = { id: "job-3", query: "x", lat: 0, lon: 0, raio_m: 10000, depth: 5, buscar_email: false };
    const supabase = makeSupabaseMock([
      { data: proximo, error: null }, // select do próximo
      { data: null, error: null }, // update condicional não bateu mais (outra execução já pegou)
    ]);
    const resultado = await enviarProximoDaFila(supabase);
    expect(resultado).toBeNull();
    expect(criarJob).not.toHaveBeenCalled();
  });
});

describe("processarJobEmAndamento", () => {
  it("retorna null quando não há job em andamento", async () => {
    const supabase = makeSupabaseMock([{ data: null, error: null }]);
    const resultado = await processarJobEmAndamento(supabase);
    expect(resultado).toBeNull();
  });

  it("importa o CSV e conclui quando o scraper reporta sucesso", async () => {
    const job = { id: "job-4", status: "processando", job_externo_id: "ext-1", iniciado_em: new Date().toISOString(), tentativas: 0, buscar_redes: false };
    const supabase = makeSupabaseMock([
      { data: job, error: null }, // select do job em andamento
      { data: null, error: null }, // update status -> importando
      { data: null, error: null }, // update status -> concluido
    ]);
    (statusJob as any).mockResolvedValue({ status: "ok" });
    (importarJobService as any).mockResolvedValue({ totalNovos: 3 });

    const resultado = await processarJobEmAndamento(supabase);
    expect(importarJobService).toHaveBeenCalledWith("job-4");
    expect(resultado).toMatchObject({ id: "job-4", status: "concluido" });
  });

  it("trata como falha quando o scraper reporta erro", async () => {
    const job = { id: "job-5", status: "processando", job_externo_id: "ext-2", iniciado_em: new Date().toISOString(), tentativas: 0, buscar_redes: false };
    const supabase = makeSupabaseMock([
      { data: job, error: null }, // select do job em andamento
      { data: null, error: null }, // update pra 'fila' de novo (retry) dentro de tratarFalha
    ]);
    (statusJob as any).mockResolvedValue({ status: "failed" });

    const resultado = await processarJobEmAndamento(supabase);
    expect(resultado).toMatchObject({ id: "job-5", status: "fila", tentativa: 1 });
  });

  it("trata como timeout um job que passou muito do tempo máximo configurado", async () => {
    const iniciadoHaMuitoTempo = new Date(Date.now() - 60 * 60_000).toISOString(); // 1h atrás
    const job = { id: "job-6", status: "processando", job_externo_id: "ext-3", iniciado_em: iniciadoHaMuitoTempo, tentativas: 0, buscar_redes: false };
    const supabase = makeSupabaseMock([
      { data: job, error: null },
      { data: null, error: null }, // update pra 'fila' dentro de tratarFalha
    ]);

    const resultado = await processarJobEmAndamento(supabase);
    expect(statusJob).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ id: "job-6", status: "fila" });
  });
});
