# Migração: Google Places API → scraper próprio do Google Maps

## Fase 0 — Levantamento

### Arquivos que usam a Places API hoje

- `src/services/prostec/lib/google-places.ts` — cliente da Places API (New) `searchText`. Único ponto que chama a API do Google. Não persiste `place_id` em lugar nenhum hoje (a Places API New nunca teve esse campo salvo na tabela).
- `src/services/prostec/prostec.actions.ts` (`executarBuscaProstecAction`) — orquestra a busca **de forma síncrona, dentro da própria Server Action**: chama `buscarEmpresasGooglePlaces`, deduplica (`buildDedupeKey`), analisa o site de cada empresa (`analyzeSite`), calcula o score (`computeScore`/`buildReasons`/`generateApproach`), grava em `prostec_companies`/`prostec_leads`/`prostec_lead_sources`/`prostec_lead_scores`, e **já dispara a Iara automaticamente** para lead novo com telefone (respeitando um limite por execução e opt-out, via `iniciarConversaBot`).
- `src/components/prostec/nova-busca-form.tsx` — formulário "Nova busca (Google Places)", roda tudo numa única chamada de Server Action (por isso o aviso "pode demorar" na UI — a busca inteira, incluindo analisar site de cada empresa, acontece dentro do tempo de resposta da request).
- `src/services/prostec/whatsapp/prostec-bot.service.ts` — só é citado no grep porque comenta sobre `google_profile_url`/fontes de lead ao gerar a abordagem; não chama a Places API diretamente.
- `supabase/migrations/fase219_fix_telefone_prostec_conversas.sql` — só citado porque tem a palavra "places" num comentário; não é sobre a API.

### Tabelas envolvidas (schema real, `fase187_prostec_schema.sql`)

- **`prostec_companies`** — dados firmográficos da empresa: `name, category, city, state, address, phone, whatsapp, website, instagram, facebook, google_profile_url, rating, reviews_count, opening_hours, source, dedupe_key, is_demo_data`. **Não existe** hoje: `place_id`/`cid`, `linkedin`, `emails[]`, telefone em E.164, `origem` (enum), vínculo com job de busca.
- **`prostec_prospecting_searches`** — log de cada busca disparada (`city, state, radius_km, segments, quantity_requested, quantity_found, status: em_andamento|concluida|erro, created_by`). É **síncrona** — uma linha por clique em "Buscar", sem fila.
- **`prostec_leads`** — pipeline: `company_id, search_id, segment, score, temperature, status, site_analysis (jsonb), reasons (jsonb), approach_suggestion`.
- **`prostec_lead_sources`** — de onde veio cada empresa (`company_id, search_id, source_name, source_ref`).
- **`prostec_lead_scores`** — histórico de score.
- **`prostec_opt_out`** — `telefone` (PK) + motivo + origem. Já é checado por `iniciarConversaBot`.
- **`integracoes_whatsapp_prostec`** — config do bot, incluindo `auto_iniciar_bot_apos_busca` e `limite_auto_inicio_por_busca` (usados hoje pra decidir se/quantos leads recebem a primeira mensagem da Iara automaticamente após uma busca).

### O que já existe e será **reaproveitado**, não recriado

- **`src/services/prostec/lib/site-analyzer.ts`** (`analyzeSite`) — já faz o fetch do site com timeout/limite de tamanho e já extrai Instagram e WhatsApp reais do HTML (regex, nunca inventa). A Fase 3 deste plano **estende** esse arquivo pra também extrair Facebook, LinkedIn e e-mails, em vez de criar um `redes-sociais.service.ts` paralelo que duplicaria o fetch do HTML.
- **`src/services/prostec/lib/score-engine.ts`** (`computeScore`, `buildReasons`, `generateApproach`) — motor de pontuação existente, usado como está.
- **A lógica de deduplicação** (`buildDedupeKey` + busca de duplicata por telefone/site/nome+cidade) já existe dentro de `executarBuscaProstecAction` — a Fase 3 extrai isso pra um módulo próprio (`deduplicacao.ts`) e adiciona o critério `gmaps_place_id`.
- **`prostec_companies` / `prostec_leads` / `prostec_lead_sources` / `prostec_lead_scores`** continuam sendo as tabelas de destino — só ganham colunas novas (Fase 2), não são substituídas.

### Fluxo atual (síncrono, Places API)

```
Clique em "Buscar" (NovaBuscaForm)
  → executarBuscaProstecAction (dentro da própria request HTTP)
      → buscarEmpresasGooglePlaces (Google Places API, paginado)
      → por empresa: dedupe → analyzeSite → computeScore → insert/update
      → dispara Iara automaticamente pra lead novo (até um limite)
  → resposta com contadores
```

Problema prático: tudo roda dentro do tempo de uma única request (arriscado em planos com timeout curto de função serverless) e depende de uma API paga do Google com o histórico de erro de permissão já visto nesta conversa.

### Fluxo novo (assíncrono, scraper próprio)

```
"Nova busca" na aba Captação
  → criarBuscaAction cria 1 registro por nicho em prostec_scrape_jobs (status 'fila'), já geocodificado
  → cron (a cada poucos minutos) pega o próximo da fila, um de cada vez:
      envia job pro scraper (gateway Caddy) → status 'enviado'/'processando'
      quando terminar: baixa o CSV → importar-job.service
        parse → normaliza (telefone E.164, site, e-mails) → checa opt-out → dedup → insert/update
        → dispara o scoring engine existente (computeScore/buildReasons/generateApproach)
        → entra na primeira etapa do pipeline
        → NÃO dispara a Iara automaticamente (mudança de comportamento deliberada, ver Fase 7)
      enriquecimento de redes sociais roda depois, em lotes (analyzeSite estendido)
  → aba Captação mostra status/contadores em tempo real (polling)
```

### Mudança de comportamento que o operador precisa saber

Hoje, leads novos vindos de uma busca **recebem mensagem automática da Iara** (respeitando opt-out e um limite por execução). O prompt desta migração pede explicitamente o contrário para leads do scraper: **entram no pipeline, mas não recebem contato automático só por terem sido importados** — a abordagem continua manual/pelo fluxo de qualificação existente. Ver Fase 7.
