#!/usr/bin/env node
/**
 * Smoke test do Prostec Scraper — confirma, antes de mexer em produção,
 * que a API do gosom/google-maps-scraper responde do jeito esperado:
 * cria um job pequeno de teste e consulta o status dele.
 *
 * Usa as MESMAS variáveis de ambiente do Neotec OS (ver .env.local.example):
 *   PROSTEC_SCRAPER_URL       — local: http://localhost:8080 (compose só sobe o
 *                                scraper puro, sem gateway — ver docker-compose.yml)
 *                                produção: URL do gateway Caddy no Railway
 *   PROSTEC_SCRAPER_API_KEY   — vazio em local (sem gateway = sem auth);
 *                                obrigatório em produção (mesma SCRAPER_API_KEY do gateway)
 *
 * Uso local:
 *   1. cd infra/prostec-scraper && docker compose up -d
 *   2. PROSTEC_SCRAPER_URL=http://localhost:8080 node scripts/prostec-scraper-smoke.mjs
 *
 * Uso contra o gateway do Railway (checa também que a auth está funcionando):
 *   PROSTEC_SCRAPER_URL=https://<gateway>.up.railway.app \
 *   PROSTEC_SCRAPER_API_KEY=<a chave de verdade> \
 *   node scripts/prostec-scraper-smoke.mjs
 *
 * Sai com código != 0 se qualquer checagem falhar (dá pra plugar em CI).
 */

const BASE_URL = process.env.PROSTEC_SCRAPER_URL ?? "http://localhost:8080";
const API_KEY = process.env.PROSTEC_SCRAPER_API_KEY ?? "";
const headers = (extra = {}) => (API_KEY ? { "X-Api-Key": API_KEY, ...extra } : extra);

let falhas = 0;
const ok = (descricao) => console.log(`✅ ${descricao}`);
const falha = (descricao, detalhe) => { falhas++; console.error(`❌ ${descricao}${detalhe ? ` — ${detalhe}` : ""}`); };

async function main() {
  console.log(`Alvo: ${BASE_URL} ${API_KEY ? "(com X-Api-Key — modo gateway)" : "(sem chave — modo local direto)"}\n`);

  // Checagens de autenticação só fazem sentido quando existe gateway (produção) —
  // localmente o compose sobe o scraper puro, sem Caddy na frente.
  if (API_KEY) {
    try {
      const semHeader = await fetch(`${BASE_URL}/api/v1/jobs`);
      if (semHeader.status === 401) ok("Sem X-Api-Key retorna 401");
      else falha("Sem X-Api-Key deveria retornar 401", `veio ${semHeader.status}`);
    } catch (err) {
      falha("Não consegui nem conectar no gateway", err instanceof Error ? err.message : String(err));
      return relatorioFinal();
    }

    const headerErrado = await fetch(`${BASE_URL}/api/v1/jobs`, { headers: { "X-Api-Key": "chave-errada-de-proposito" } });
    if (headerErrado.status === 401) ok("X-Api-Key errada retorna 401");
    else falha("X-Api-Key errada deveria retornar 401", `veio ${headerErrado.status}`);

    const rotaProibida = await fetch(`${BASE_URL}/`, { headers: headers() });
    if (rotaProibida.status === 404) ok("Raiz (/) bloqueada mesmo com a chave certa (UI web do gosom não vaza)");
    else falha("Raiz (/) deveria retornar 404", `veio ${rotaProibida.status}`);
  }

  const listaJobs = await fetch(`${BASE_URL}/api/v1/jobs`, { headers: headers() }).catch((err) => {
    falha("Não consegui conectar em /api/v1/jobs", err instanceof Error ? err.message : String(err));
    return null;
  });
  if (!listaJobs) return relatorioFinal();
  if (listaJobs.ok) {
    ok("GET /api/v1/jobs responde 200");
  } else {
    falha("GET /api/v1/jobs deveria retornar 200", `veio ${listaJobs.status}`);
    return relatorioFinal();
  }

  const nomeJobTeste = `smoke-test-${Date.now()}`;
  const criacao = await fetch(`${BASE_URL}/api/v1/jobs`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      name: nomeJobTeste, keywords: ["padaria em Araguari"], lang: "pt",
      zoom: 15, lat: "-18.6489", lon: "-48.1875", fast_mode: true, radius: 5000, depth: 1, email: false, max_time: 60,
    }),
  });
  if (!criacao.ok) {
    falha("POST /api/v1/jobs falhou", `status ${criacao.status}`);
    return relatorioFinal();
  }
  const jobCriado = await criacao.json();
  if (!jobCriado?.id) {
    falha("Resposta do POST /api/v1/jobs não trouxe id do job", JSON.stringify(jobCriado));
    return relatorioFinal();
  }
  ok(`Job de teste criado (id ${jobCriado.id})`);

  const status = await fetch(`${BASE_URL}/api/v1/jobs/${jobCriado.id}`, { headers: headers() });
  if (status.ok) ok("GET /api/v1/jobs/{id} retorna o status do job criado");
  else falha("GET /api/v1/jobs/{id} deveria retornar 200", `veio ${status.status}`);

  console.log("\nAviso: o job de teste continua rodando em background no scraper (é rápido — depth 1, fast_mode). Não precisa cancelar manualmente.");
  relatorioFinal();
}

function relatorioFinal() {
  console.log(`\n${falhas === 0 ? "✅ Smoke test OK" : `❌ ${falhas} checagem(ns) falharam`}`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Erro inesperado no smoke test:", err);
  process.exit(1);
});
