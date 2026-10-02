# NEO PERFORMANCE — documentação interna

Módulo de aquisição/performance dentro do Neotec OS. Este documento cobre o que a Seção 58 do prompt mestre pediu: arquitetura, banco, integrações, variáveis de ambiente, agentes, ferramentas, permissões, regras, jobs e troubleshooting. Para o racional de *por que* cada decisão foi tomada, ver os comentários no topo de cada migração (`fase259`/`fase260`/`fase261`) — este arquivo é o resumo operacional, as migrações são a fonte da verdade.

## Arquitetura

```
Frontend (src/app/(sistema)/neo-performance/**)
  ↓
Server Actions (src/services/neo-performance/*.actions.ts)
  ↓
Services (src/services/neo-performance/*.service.ts)
  ↓
Supabase (RLS por loja_id) + ia.service.ts (Claude/outros provedores de texto)
```

Nenhuma lógica de negócio vive em componente de UI — toda regra está em `*.service.ts`, chamada só via `*.actions.ts` (`"use server"`). Mesma convenção do resto do Neotec OS.

Multi-tenant: `loja_id` em toda tabela nova, mesma função `current_user_loja_id()`/`current_user_cargo()` da Fase 3 original do sistema. Não existe hoje uma tela de "gerenciar múltiplas empresas" — a arquitetura suporta, mas o produto multiempresa (Seção 37) não foi construído.

## Banco (migrações)

- `fase259_neo_performance_fundacao.sql` — feature_flags, `neo_performance_config` (perfil + limites), `ads_contas/campanhas/metricas_diarias/sync_log`, `attribution_eventos`, `loja_sessoes` +UTM, `performance_diagnosticos`, `performance_decisoes`.
- `fase260_neo_performance_inteligencia_automacao.sql` — `referencias_criativas`, `hooks_biblioteca`, `ofertas_biblioteca`, `creative_briefs`, `test_lab_testes`, `automation_regras`; acrescenta colunas de autonomia/kill switch em `neo_performance_config`, colunas de pausa em `ads_contas`, colunas de auditoria em `performance_decisoes`.
- `fase261_neo_performance_oportunidades.sql` — tabela `oportunidades`.

Todas com RLS (`admin`/`gerente`, exceto `automation_regras` e o modo de autonomia, que são `admin` só). Nenhuma tabela duplica dado que já existia em `vendas`, `crm_cards`, `loja_sessoes` ou `produtos`/`estoque` — ver o cabeçalho de cada migração pra o detalhe de reaproveitamento.

## Integrações e variáveis de ambiente

| Integração | Variáveis | Status |
|---|---|---|
| Meta Ads | `META_ADS_ACCESS_TOKEN`, `META_ADS_APP_SECRET`, `META_ADS_AD_ACCOUNT_ID` | Schema pronto, sync real **não implementada** |
| Google Ads | `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID` | Schema pronto, sync real **não implementada** |
| Gemini (imagem) | `GEMINI_IMAGE_API_KEY` | **Não implementada** — `GEMINI_API_KEY` existente é só pra texto (Central de Cotações) |
| Claude/IA de texto | `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GEMINI_API_KEY` (já existentes) | Funcional, via `ia.service.ts` |

`/neo-performance/system-health` mostra o status real de cada uma (nunca "conectado" sem checagem — ver `system-health.service.ts`).

## Agentes e ferramentas

Não existe, hoje, um loop de agente com tool-calling formal (Seções 46-47 do prompt mestre, não implementadas). O que existe:

- **Claude como camada de raciocínio**: toda chamada passa por `ia.service.ts` → `executarPromptIA({ modulo: "neo_performance_creative", ... })`, nunca um provider direto. Usado em `referencias.service.ts` (extração de DNA) e `creative-factory.service.ts` (roteiro/copy).
- **Automation Engine** (`automation-engine.service.ts`): avalia regras SE/E/ENTÃO contra o desempenho real das campanhas. Não é um "agente" autônomo de verdade — é uma função determinística chamada sob demanda (`avaliarRegrasAction`), não um job rodando sozinho.
- **Sistema de Confidence** (`confidence.service.ts`): pontua 0-100 antes de qualquer ação ser proposta; nível exigido cresce com o gasto envolvido.

Se o objetivo futuro for um agente real (Claude decidindo e chamando ferramentas estruturadas como `get_campaigns()`, `update_budget()`, etc., com permissões READ/WRITE/FINANCIAL/PUBLISH/DELETE por ferramenta), isso é uma decisão de arquitetura maior — não foi construído especulativamente.

## Permissões

- Dados financeiros/de campanha: `podeVerCusto()` (`admin`/`gerente`) — mesma régua de Analytics/Vendas.
- Configuração, automação, pausar contas: `podeGerenciarUsuarios()` (`admin` só).
- RLS no banco é a garantia real (como em todo o resto do sistema) — os checks de cargo na UI são só pra não mostrar tela vazia.

## Regras de negócio centrais

- **Nunca uma métrica isolada decide algo** (regra 61 do prompt mestre) — toda regra de diagnóstico/automação combina ≥2 condições.
- **Nunca fingir integração** (Seção 57) — qualquer função que dependeria de API externa sem credencial lança erro explícito, nunca retorna dado inventado.
- **Kill switch nasce travado** (`neo_performance_config.automacoes_pausadas = true` por padrão) — ninguém precisa lembrar de travar.
- **Nenhum modo de autonomia altera orçamento real** — não há write-API; toda "ação" fica em `performance_decisoes.status = 'aguardando_avaliacao'`.

## Jobs

Nenhum cron automático foi criado para o NEO PERFORMANCE ainda — tudo (`rodarDiagnosticoAction`, `avaliarRegrasAction`, `detectarOportunidadesAction`) é disparado manualmente pela UI. Se/quando entrar um cron (ex: diagnóstico diário automático), seguir o padrão já usado em `/api/cron/follow-up-vendas` (idempotente, protegido por `CRON_SECRET`).

## Troubleshooting

- **Dashboard todo zerado**: normal sem conta de anúncio conectada e sem métrica lançada em `ads_metricas_diarias`. Não é bug.
- **Botão de sincronizar sempre dá erro**: esperado até as credenciais de Meta/Google existirem (ver tabela acima).
- **Página de Inteligência/Creative Factory/Automação redireciona pra Configurações**: a feature flag correspondente (`creative_intelligence`, `creative_factory`, `automation_engine`) está desligada — ligue em Configurações → Feature flags.
- **Decisão nunca sai de "aguardando_avaliacao"**: esperado — não existe write-API; avaliar manualmente e registrar o resultado real observado.
