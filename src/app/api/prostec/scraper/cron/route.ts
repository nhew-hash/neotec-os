import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarJob, statusJob } from "@/services/prostec/scraper/scraper.client";
import { importarJobService, enriquecerLotePendente } from "@/services/prostec/scraper/importar-job.service";

export const maxDuration = 60;

/**
 * Cron do Prostec Scraper — regra de ouro: no máximo 1 job rodando no
 * scraper por vez (buscas em paralelo fazem o Google bloquear o IP).
 *
 * A cada execução:
 *  1. Se tem job em andamento (enviado/processando), consulta o status.
 *  2. Se não tem nenhum rodando, pega o próximo da fila (FIFO) e envia.
 *  3. Roda um lote de enriquecimento de redes sociais (Fase 4.3),
 *     independente do que aconteceu nos passos acima.
 *
 * Autenticada pelo mesmo CRON_SECRET das outras rotas de cron do
 * projeto — funciona com o Vercel Cron OU com um pinger externo
 * (ver infra/prostec-scraper/README.md sobre o limite de frequência
 * do plano Hobby da Vercel).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const supabase = createAdminClient();
  const log: Record<string, unknown> = {};

  try {
    log.jobAtivo = await processarJobEmAndamento(supabase);
    if (!log.jobAtivo) {
      log.jobEnviado = await enviarProximoDaFila(supabase);
    }
    log.enriquecimento = await enriquecerLotePendente(40);
    return NextResponse.json({ ok: true, ...log });
  } catch (err) {
    console.error("[prostec-scraper-cron] Erro:", err);
    return NextResponse.json({ ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido", ...log }, { status: 500 });
  }
}

export const MAX_TENTATIVAS = 2;

// Exportadas (só) pra teste de unidade da máquina de estados — o handler
// GET acima continua sendo o único jeito "de verdade" de disparar isso.
export async function processarJobEmAndamento(supabase: ReturnType<typeof createAdminClient>): Promise<Record<string, unknown> | null> {
  const { data: job } = await supabase
    .from("prostec_scrape_jobs")
    .select("*")
    .in("status", ["enviado", "processando"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!job) return null;

  // Timeout: se passou do max_time configurado + 5min de folga, trata
  // como falho mesmo sem resposta do scraper (evita ficar preso pra
  // sempre num job que o gosom nunca terminou/travou).
  const maxTimeMs = Number(process.env.PROSTEC_SCRAPER_MAX_TIME ?? 600) * 1000 + 5 * 60_000;
  const iniciadoEm = job.iniciado_em ? new Date(job.iniciado_em).getTime() : Date.now();
  if (Date.now() - iniciadoEm > maxTimeMs) {
    return await tratarFalha(supabase, job, "Timeout — o scraper não terminou dentro do tempo esperado.");
  }

  let statusExterno;
  try {
    statusExterno = await statusJob(job.job_externo_id);
  } catch (err) {
    // Falha de rede consultando o status não é falha do JOB em si —
    // só tenta de novo na próxima execução do cron.
    return { id: job.id, status: job.status, aviso: `Falha ao consultar status: ${err instanceof Error ? err.message : "erro desconhecido"}` };
  }

  const status = statusExterno.status.toLowerCase();

  if (status === "ok" || status === "success" || status === "done") {
    await supabase.from("prostec_scrape_jobs").update({ status: "importando" }).eq("id", job.id);
    try {
      await importarJobService(job.id);
    } catch (err) {
      return await tratarFalha(supabase, job, `Falha ao importar CSV: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    }
    const proximoStatus = job.buscar_redes ? "enriquecendo" : "concluido";
    await supabase.from("prostec_scrape_jobs").update({ status: proximoStatus, finalizado_em: new Date().toISOString() }).eq("id", job.id);
    // "enriquecendo" é só informativo pra UI — o lote de enriquecimento
    // (Fase 4.3) roda de forma independente pra QUALQUER empresa
    // pendente, não fica esperando esse job específico terminar. Marca
    // como concluído de fato assim que a importação termina.
    if (proximoStatus === "enriquecendo") {
      await supabase.from("prostec_scrape_jobs").update({ status: "concluido" }).eq("id", job.id);
    }
    return { id: job.id, status: "concluido" };
  }

  if (status === "failed" || status === "error") {
    return await tratarFalha(supabase, job, "O scraper reportou falha no job.");
  }

  // pending/working/processando — ainda rodando, só atualiza o status visível.
  if (job.status !== "processando") {
    await supabase.from("prostec_scrape_jobs").update({ status: "processando" }).eq("id", job.id);
  }
  return { id: job.id, status: "processando" };
}

export async function tratarFalha(supabase: ReturnType<typeof createAdminClient>, job: { id: string; tentativas: number }, motivo: string) {
  const tentativas = (job.tentativas ?? 0) + 1;
  if (tentativas <= MAX_TENTATIVAS) {
    // Volta pra fila pra tentar de novo — job_externo_id null pra
    // forçar o envio de um job novo no scraper.
    await supabase.from("prostec_scrape_jobs").update({
      status: "fila", tentativas, erro: motivo, job_externo_id: null, iniciado_em: null,
    }).eq("id", job.id);
    return { id: job.id, status: "fila", motivo, tentativa: tentativas };
  }
  await supabase.from("prostec_scrape_jobs").update({
    status: "erro", tentativas, erro: motivo, finalizado_em: new Date().toISOString(),
  }).eq("id", job.id);
  return { id: job.id, status: "erro", motivo };
}

export async function enviarProximoDaFila(supabase: ReturnType<typeof createAdminClient>): Promise<Record<string, unknown> | null> {
  // Update condicional (WHERE status = 'fila') é atômico no Postgres —
  // evita duas execuções do cron pegando o mesmo job em paralelo sem
  // precisar de advisory lock explícito.
  const { data: proximo } = await supabase
    .from("prostec_scrape_jobs")
    .select("*")
    .eq("status", "fila")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!proximo) return null;

  const { data: reservado } = await supabase
    .from("prostec_scrape_jobs")
    .update({ status: "enviado", iniciado_em: new Date().toISOString() })
    .eq("id", proximo.id)
    .eq("status", "fila") // condicional — se outra execução já pegou, isso não bate mais e retorna vazio
    .select("id")
    .maybeSingle();
  if (!reservado) return null; // outra execução do cron já pegou esse job

  try {
    const jobExterno = await criarJob({
      name: `prostec-${proximo.id}`,
      keywords: [proximo.query],
      lang: "pt",
      zoom: 15,
      lat: String(proximo.lat),
      lon: String(proximo.lon),
      fast_mode: false,
      radius: proximo.raio_m,
      depth: proximo.depth,
      email: proximo.buscar_email,
      max_time: Number(process.env.PROSTEC_SCRAPER_MAX_TIME ?? 600),
    });
    await supabase.from("prostec_scrape_jobs").update({ job_externo_id: jobExterno.id }).eq("id", proximo.id);
    return { id: proximo.id, status: "enviado", jobExternoId: jobExterno.id };
  } catch (err) {
    return await tratarFalha(supabase, proximo, `Falha ao enviar job pro scraper: ${err instanceof Error ? err.message : "erro desconhecido"}`);
  }
}
