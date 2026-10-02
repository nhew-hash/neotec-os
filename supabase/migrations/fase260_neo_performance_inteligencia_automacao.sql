-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 260 (Supabase / PostgreSQL)
-- NEO PERFORMANCE — Fase 2 (Central de Inteligência + Creative Factory) e
-- Fase 3 (Automação e Autonomia), construídas em sequência a pedido
-- explícito do usuário ("já cria tudo sem parar"), mas sem abrir mão da
-- Regra Zero: nada aqui recria/duplica o que a fase259 já criou.
--
-- Reaproveitado desta vez:
--   - `ads_campanhas`/`ads_metricas_diarias` (fase259) → Test Lab,
--     Simulation Mode e Backtest leem daqui, não duplicam histórico.
--   - `performance_decisoes` (fase259) → só GANHA colunas novas de
--     auditoria (quem/valor anterior/valor novo), não é recriada.
--   - `src/services/ia/ia.service.ts` (`executarPromptIA`) → é o que o
--     Creative Factory chama pra Claude (estratégia/copy/roteiro). Não
--     existe tabela nova de "configuração de IA" aqui por isso.
--   - `loja_id` já é o identificador multi-tenant desde a fase3 — por
--     isso Fase 4 (multiempresa) não ganha uma tabela "empresas" nova
--     nesta migração: a arquitetura já nasceu multi-tenant.
-- ============================================================================


-- ============================================================================
-- FASE 2 — CENTRAL DE INTELIGÊNCIA (Seções 12 a 16)
-- ============================================================================

create type status_validacao_criativo as enum (
  'ideia', 'referencia', 'hipotese', 'testando', 'validada', 'escalavel', 'saturada'
);

-- Uma referência = um criativo (próprio ou de terceiros, só o que for
-- tecnicamente permitido via API oficial/fonte pública — Seção 12) com o
-- "DNA" extraído (Seção 14). Nunca guarda o arquivo de mídia de terceiro
-- em si (risco de direito autoral — mesma cautela já aplicada no projeto
-- de Instagram da Neotec); só a ANÁLISE estrutural e um link de origem.
create table if not exists referencias_criativas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  origem text not null, -- 'meta_ad_library' | 'youtube' | 'interno' | 'fornecido_pelo_usuario' | etc (texto livre, não enum — fontes crescem)
  url_origem text,
  status status_validacao_criativo not null default 'ideia',

  -- DNA do criativo (Seção 14)
  hook text,
  assunto text,
  formato text,
  duracao_segundos integer,
  estrutura text,
  cta text,
  oferta text,
  emocao text,
  publico text,
  produto text,
  argumento text,
  prova text,
  estilo_visual text,
  texto_identificado text,
  ritmo text,
  enquadramento text,

  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios(id)
);

create index idx_referencias_criativas_status on referencias_criativas(status);

create trigger trg_referencias_criativas_updated_at
  before update on referencias_criativas
  for each row execute function set_updated_at();

alter table referencias_criativas enable row level security;
create policy "referencias_criativas_admin_gerente" on referencias_criativas for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Hook Library (Seção 15)
create table if not exists hooks_biblioteca (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  categoria text not null check (categoria in (
    'curiosidade', 'problema', 'comparacao', 'preco', 'urgencia', 'prova_social',
    'autoridade', 'erro_comum', 'lista', 'transformacao', 'oportunidade', 'quebra_objecao'
  )),
  texto text not null,
  origem_referencia_id uuid references referencias_criativas(id) on delete set null,
  quantidade_testes integer not null default 0,
  resultados jsonb not null default '{}', -- agregado leve (ex: {"vendas": 3, "gasto_total": 450}); histórico detalhado fica em test_lab_testes
  produtos_utilizados text[] not null default '{}',
  taxa_sucesso numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_hooks_biblioteca_updated_at
  before update on hooks_biblioteca
  for each row execute function set_updated_at();

alter table hooks_biblioteca enable row level security;
create policy "hooks_biblioteca_admin_gerente" on hooks_biblioteca for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Biblioteca de ofertas (Seção 16)
create table if not exists ofertas_biblioteca (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  descricao text,
  produto text,
  margem_estimada numeric(12,2),
  periodo_inicio date,
  periodo_fim date,
  campanha_id uuid references ads_campanhas(id) on delete set null,
  vendas_geradas integer not null default 0,
  cac numeric(12,2),
  lucro numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_ofertas_biblioteca_updated_at
  before update on ofertas_biblioteca
  for each row execute function set_updated_at();

alter table ofertas_biblioteca enable row level security;
create policy "ofertas_biblioteca_admin_gerente" on ofertas_biblioteca for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());


-- ============================================================================
-- FASE 2 — CREATIVE FACTORY + TEST LAB (Seções 17 a 21)
-- ============================================================================

-- Um "brief" é uma passagem pelo fluxo Objetivo→Produto→Público→Hipótese→
-- Hook→Roteiro→Copy→Criativo (Seção 17). Roteiro/copy vêm do Claude (via
-- ia.service.ts); a imagem/variação visual viria do Gemini quando a flag
-- `gemini` estiver ativa e houver GEMINI_API_KEY (ver creative-factory.service.ts).
create table if not exists creative_briefs (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  objetivo text not null,
  produto text,
  publico text,
  hipotese text,
  hook_id uuid references hooks_biblioteca(id) on delete set null,
  roteiro text, -- gerado pelo Claude
  copy text, -- gerado pelo Claude
  imagem_url text, -- gerado pelo Gemini, quando configurado
  status text not null default 'rascunho' check (status in ('rascunho', 'pronto', 'em_teste', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references usuarios(id)
);

create trigger trg_creative_briefs_updated_at
  before update on creative_briefs
  for each row execute function set_updated_at();

alter table creative_briefs enable row level security;
create policy "creative_briefs_admin_gerente" on creative_briefs for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

-- Test Lab (Seções 20-21) — todo teste declara hipótese/variável/controle/
-- métrica antes de rodar, e só pode ser declarado vencedor com amostra
-- mínima atingida (checado em test-lab.service.ts, nunca no banco sozinho,
-- porque a regra "dados insuficientes → continuar coleta" é lógica, não
-- constraint).
create table if not exists test_lab_testes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  brief_id uuid references creative_briefs(id) on delete set null,
  campanha_id uuid references ads_campanhas(id) on delete set null,

  hipotese text not null,
  variavel text not null,
  controle text not null,
  metrica_principal text not null,
  metricas_secundarias text[] not null default '{}',
  duracao_minima_dias integer not null default 7,
  amostra_minima integer not null default 30, -- ex: compras mínimas antes de decidir

  status text not null default 'planejado' check (status in ('planejado', 'rodando', 'dados_insuficientes', 'concluido')),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  resultado text, -- preenchido só quando amostra_minima + duracao_minima_dias forem atingidos
  vencedor boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_test_lab_testes_updated_at
  before update on test_lab_testes
  for each row execute function set_updated_at();

alter table test_lab_testes enable row level security;
create policy "test_lab_testes_admin_gerente" on test_lab_testes for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id())
  with check (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());


-- ============================================================================
-- FASE 3 — AUTOMATION ENGINE + NÍVEIS DE AUTONOMIA + KILL SWITCH
-- (Seções 22 a 31)
-- ============================================================================

-- Motor de regras SE/E/ENTÃO (Seção 22). `condicoes` guarda a lista de
-- condições em JSON (ex: [{"campo":"cac","operador":">","valor":150}]) —
-- um DSL mínimo, avaliado em automation-engine.service.ts, nunca no banco.
create table if not exists automation_regras (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  condicoes jsonb not null default '[]',
  acao text not null, -- ex: "reduzir_orcamento_15pct"
  ativa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_automation_regras_updated_at
  before update on automation_regras
  for each row execute function set_updated_at();

alter table automation_regras enable row level security;
create policy "automation_regras_admin" on automation_regras for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id())
  with check (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- Nível de autonomia + kill switch (Seções 23-25) + limites absolutos
-- (Seção 24, que reaproveita os campos de limite já criados em
-- neo_performance_config na fase259 — só ACRESCENTA o que faltava: modo,
-- kill switch, limites de operação da automação em si).
alter table neo_performance_config add column if not exists modo_autonomia text not null default 'observacao'
  check (modo_autonomia in ('observacao', 'recomendacao', 'controlado', 'autonomo'));
alter table neo_performance_config add column if not exists automacoes_pausadas boolean not null default true; -- kill switch — nasce travado
alter table neo_performance_config add column if not exists automacoes_pausadas_em timestamptz;
alter table neo_performance_config add column if not exists gasto_maximo_sem_venda numeric(12,2);
alter table neo_performance_config add column if not exists limite_criacao_campanhas_dia integer not null default 0;
alter table neo_performance_config add column if not exists limite_alteracoes_dia integer not null default 0;

-- Contas pausadas individualmente ("PAUSAR CONTA", Seção 25) — pausa de
-- emergência por conta, independente do kill switch global.
alter table ads_contas add column if not exists pausada_em timestamptz;
alter table ads_contas add column if not exists pausada_motivo text;

-- Auditoria completa de ação automática (Seção 26) — acrescenta à
-- `performance_decisoes` já criada na fase259 (não recria a tabela).
alter table performance_decisoes add column if not exists executado_por uuid references usuarios(id); -- null quando foi o próprio agente
alter table performance_decisoes add column if not exists valor_anterior jsonb;
alter table performance_decisoes add column if not exists valor_novo jsonb;
alter table performance_decisoes add column if not exists modo_autonomia_no_momento text;

-- Performance Memory (Seção 31) — não é tabela nova: é a LEITURA
-- combinada de performance_decisoes + performance_diagnosticos +
-- test_lab_testes + ofertas_biblioteca (ver performance-memory.service.ts).
-- Only índice extra pra essa consulta não virar N+1 (Seção 53).
create index if not exists idx_performance_decisoes_tipo on performance_decisoes(tipo_decisao);
create index if not exists idx_test_lab_status on test_lab_testes(status);

-- ============================================================================
-- Atualiza as flags que a fase259 criou como "ainda não implementada" —
-- agora têm código de verdade por trás, então a descrição mentia e a
-- flag ficava desligada sem motivo. `creative_intelligence` e
-- `creative_factory` são só leitura/registro manual (sem risco
-- financeiro), então já nascem ligadas. `automation_engine` também liga
-- — a tela some sem isso — mas o kill switch (`automacoes_pausadas`,
-- default true) continua travando qualquer ação de verdade.
-- ============================================================================
update feature_flags set ativo = true, descricao = 'Central de Inteligência: referências criativas, DNA, hooks e ofertas (Fase 2)'
  where chave = 'creative_intelligence';
update feature_flags set ativo = true, descricao = 'Creative Factory + Test Lab: briefs, roteiro/copy via Claude, testes com amostra mínima (Fase 2)'
  where chave = 'creative_factory';
update feature_flags set ativo = true, descricao = 'Automation Engine: regras SE/E/ENTÃO, modos de autonomia, kill switch (trancado por padrão), backtest (Fase 3)'
  where chave = 'automation_engine';
update feature_flags set descricao = 'Geração de imagem de criativos via Gemini — precisa de GEMINI_IMAGE_API_KEY (ver .env.local.example)'
  where chave = 'gemini';

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 260
-- ============================================================================
