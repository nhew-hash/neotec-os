-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 232 (Supabase / PostgreSQL)
-- Empresa que já tem site não é lead viável pra Prostec (o produto
-- vendido é justamente o site) — a importação do scraper agora ignora
-- essas empresas na hora de criar o lead (nunca entram no pipeline).
-- Esta coluna só registra a contagem pra aparecer na tela de buscas.
-- Ver src/services/prostec/scraper/importar-job.service.ts
-- ============================================================================

alter table prostec_scrape_jobs
  add column if not exists total_ignorados_possui_site integer not null default 0;
