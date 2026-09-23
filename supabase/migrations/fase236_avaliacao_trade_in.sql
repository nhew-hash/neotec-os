-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 236 (Supabase / PostgreSQL)
-- Módulo de Avaliação de Troca (trade-in) — schema completo.
--
-- Evolui `solicitacoes_trade_in` (Fase 60, só um lead sem cálculo) pra um
-- motor de verdade: tabela de valor-base de troca SEPARADA do preço de
-- venda, catálogo de avarias com desconto configurável por modelo,
-- histórico com SNAPSHOT (mudar a tabela amanhã não altera avaliação
-- de ontem), e ligação com vendas/estoque.
--
-- `solicitacoes_trade_in` (Fase 60) fica como está — é o fallback quando
-- o cliente descreve um aparelho que ainda não está na tabela de
-- modelos (vira lead manual do jeito que já funciona). Não foi removida
-- nem substituída.
-- ============================================================================

-- ============================================================================
-- 1) Catálogo de avarias (fixas + personalizadas pelo admin)
-- ============================================================================

create table if not exists troca_avarias (
  codigo        text primary key,
  nome          text not null,
  descricao     text,
  ordem         integer not null default 100,
  -- Sinal de líquido, IMEI bloqueado etc — avaria que pode travar o
  -- trade-in inteiro, não só descontar (usada no motor: `bloqueia`).
  bloqueia      boolean not null default false,
  ativo         boolean not null default true,
  personalizada boolean not null default false,
  created_at    timestamptz not null default now()
);

insert into troca_avarias (codigo, nome, descricao, ordem, bloqueia) values
  ('bateria', 'Bateria', 'Saúde da bateria abaixo do corte configurado', 10, false),
  ('tela', 'Tela (touch/imagem)', 'Trincada, manchada, touch falhando', 20, false),
  ('marcas_leves', 'Marcas leves', 'Riscos superficiais na carcaça/tela', 30, false),
  ('marcas_moderadas', 'Marcas moderadas', 'Amassados, riscos profundos, traseira trincada', 40, false),
  ('face_id', 'Face ID / Touch ID', 'Biometria não funciona', 50, false),
  ('camera_traseira', 'Câmera traseira', 'Foco, lente trincada, foto ruim', 60, false),
  ('camera_frontal', 'Câmera frontal', 'Selfie/vídeo com problema', 70, false),
  ('doc_carga', 'Conector de carga', 'Não carrega ou carrega mal', 80, false),
  ('alto_falante_microfone', 'Alto-falante / microfone', 'Som ou captação de áudio com defeito', 90, false),
  ('botoes', 'Botões', 'Volume, power, silencioso, Ação com defeito', 100, false),
  ('wifi_bluetooth', 'Wi-Fi / Bluetooth', 'Conectividade com problema', 110, false),
  ('vibracao', 'Vibração', 'Motor de vibração não funciona', 120, false),
  ('sensores', 'Sensores (proximidade/rotação)', 'Tela não apaga na ligação, rotação não funciona', 130, false),
  ('notif_peca', 'Notificação de peça não original', 'Ajustes > Geral > Sobre acusa peça não original', 140, false),
  ('pecas_substituidas', 'Peças substituídas', 'Tela, bateria ou outra peça já trocada por não original', 150, false),
  ('aberto', 'Sinais de abertura', 'Parafusos remexidos, lacres rompidos', 160, false),
  ('liquido', 'Sinais de líquido', 'Indicador de líquido acionado — normalmente BLOQUEIA o trade-in', 170, true),
  ('imei_bloqueado', 'IMEI bloqueado/restrito ou divergente', 'Consta restrição, roubo/furto, ou caixa não confere', 180, true),
  ('icloud_conta', 'Conta iCloud/Google não removida', 'Aparelho ainda logado em conta de terceiro', 190, true)
on conflict (codigo) do nothing;

-- ============================================================================
-- 2) Modelos avaliáveis + valor BASE de troca (SEPARADO do preço de venda)
-- ============================================================================

create table if not exists troca_modelos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null unique, -- ex: "iPhone 13 128GB"
  familia       text not null,        -- ex: "iPhone 13" — pra agrupar na busca
  marca         text not null default 'Apple',
  ordem         integer not null default 0,
  valor_troca   numeric(12,2) not null check (valor_troca >= 0),
  ativo         boolean not null default true,
  observacoes   text,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_troca_modelos_familia on troca_modelos (familia, ordem);
create index if not exists idx_troca_modelos_ativo on troca_modelos (ativo);

-- ============================================================================
-- 3) Desconto de cada avaria por modelo — sem linha = avaria não se
--    aplica a esse modelo (ex: modelo antigo sem "notif. peça").
-- ============================================================================

create table if not exists troca_modelo_avarias (
  modelo_id     uuid not null references troca_modelos(id) on delete cascade,
  avaria_codigo text not null references troca_avarias(codigo) on delete cascade,
  desconto      numeric(12,2) not null default 0 check (desconto >= 0),
  primary key (modelo_id, avaria_codigo)
);

-- ============================================================================
-- 4) Config (singleton) — corte de bateria, bônus por troca+seminovo, regras exibidas
-- ============================================================================

create table if not exists troca_config (
  id                 integer primary key default 1 check (id = 1),
  bateria_corte      integer not null default 80, -- saúde % abaixo disso conta como avaria "bateria"
  bonus_seminovo     numeric(12,2) not null default 0, -- bônus quando o cliente troca por um seminovo do estoque
  regras_texto       text not null default '', -- 1 regra por linha, exibida ao cliente na estimativa
  updated_at         timestamptz not null default now()
);
insert into troca_config (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_troca_config_updated_at on troca_config;
create trigger trg_troca_config_updated_at before update on troca_config for each row execute function set_updated_at();

drop trigger if exists trg_troca_modelos_updated_at on troca_modelos;
create trigger trg_troca_modelos_updated_at before update on troca_modelos for each row execute function set_updated_at();

-- ============================================================================
-- 5) Avaliações — HISTÓRICO com SNAPSHOT. Mudar a tabela de valores
--    amanhã não pode alterar o valor de uma avaliação de ontem.
-- ============================================================================

create table if not exists avaliacoes_trade_in (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  origem              text not null default 'site' check (origem in ('site', 'neotec_os', 'bot')),

  cliente_id          uuid references clientes(id) on delete set null,
  cliente_nome        text,
  cliente_telefone    text,

  modelo_id           uuid references troca_modelos(id) on delete set null,
  modelo_nome         text not null,           -- snapshot — sobrevive mesmo se o modelo for renomeado/removido
  valor_base          numeric(12,2) not null,  -- snapshot do valor_troca usado
  avarias_marcadas    jsonb not null default '[]', -- snapshot [{codigo, nome, desconto}]
  checklist_respostas jsonb not null default '{}', -- respostas cruas do checklist (auditoria completa)
  bateria_saude       integer,
  imei                text,

  total_descontos     numeric(12,2) not null default 0,
  bonus_valor         numeric(12,2) not null default 0,
  valor_calculado     numeric(12,2) not null, -- o que o motor deu (nunca editado depois)
  valor_aprovado      numeric(12,2),          -- preenchido só na aprovação — pode divergir do calculado
  valor_alterado_motivo text,                 -- obrigatório quando valor_aprovado != valor_calculado

  bloqueado           boolean not null default false,
  motivos_bloqueio    text[] not null default '{}',

  fotos               jsonb not null default '[]', -- [{tipo: 'frente'|'traseira'|'lateral'|'tela'|'dano', url}]
  observacoes         text,

  status text not null default 'estimativa' check (status in (
    'estimativa',            -- calculada pelo cliente no site, ninguém da equipe viu ainda
    'aguardando_avaliacao',  -- cliente/staff pediu avaliação física
    'em_avaliacao',          -- staff com o aparelho em mãos, preenchendo o checklist real
    'aprovado',              -- staff confirmou o valor final
    'recusado',
    'convertido_venda',      -- valor usado como abatimento numa venda
    'convertido_estoque',    -- aparelho recebido virou item de estoque
    'cancelado'
  )),
  -- Trava de dados: uma avaliação de origem "site" nunca pode nascer
  -- já aprovada/convertida — só a equipe muda o status depois de ver o
  -- aparelho de verdade. Isso vale mesmo se alguém inserir direto na
  -- tabela (a policy de insert público confia no client, esta CHECK é
  -- a rede de segurança).
  constraint chk_avaliacao_site_nasce_estimativa
    check (origem <> 'site' or status in ('estimativa', 'aguardando_avaliacao', 'cancelado')),

  venda_id            uuid references vendas(id) on delete set null,
  aparelho_id         uuid references aparelhos(id) on delete set null, -- preenchido após conversão pro estoque

  usuario_id          uuid references auth.users(id), -- staff que preencheu o checklist real
  aprovado_por        uuid references auth.users(id),
  aprovado_em         timestamptz,
  updated_at          timestamptz not null default now()
);
create index if not exists idx_avaliacoes_trade_in_status on avaliacoes_trade_in (status, created_at desc);
create index if not exists idx_avaliacoes_trade_in_cliente on avaliacoes_trade_in (cliente_id);
create index if not exists idx_avaliacoes_trade_in_imei on avaliacoes_trade_in (imei);

drop trigger if exists trg_avaliacoes_trade_in_updated_at on avaliacoes_trade_in;
create trigger trg_avaliacoes_trade_in_updated_at before update on avaliacoes_trade_in for each row execute function set_updated_at();

-- Auditoria de alteração manual do valor (Fase pedida: motivo obrigatório + quem/quando).
create table if not exists avaliacoes_trade_in_alteracoes (
  id             uuid primary key default gen_random_uuid(),
  avaliacao_id   uuid not null references avaliacoes_trade_in(id) on delete cascade,
  usuario_id     uuid references auth.users(id),
  valor_anterior numeric(12,2) not null,
  valor_novo     numeric(12,2) not null,
  motivo         text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_avaliacoes_trade_in_alteracoes_avaliacao on avaliacoes_trade_in_alteracoes (avaliacao_id);

-- ============================================================================
-- 6) Integração com vendas — abatimento (mesmo padrão do cashback_utilizado
--    já usado no PDV: valida contra o valor aprovado, nunca confia no client).
-- ============================================================================

alter table vendas add column if not exists trade_in_avaliacao_id uuid references avaliacoes_trade_in(id);
alter table vendas add column if not exists trade_in_valor numeric(12,2) not null default 0;

-- ============================================================================
-- 7) RLS — mesmo padrão staff do resto do estoque/vendas. Nada de select
--    público direto nestas tabelas (valores e regras de desconto não
--    ficam expostos): o site fala só através de Server Actions com o
--    client admin, que devolvem apenas o resultado já calculado — igual
--    ao padrão já usado em `criarTradeInAction` (Fase 60).
-- ============================================================================

alter table troca_avarias enable row level security;
alter table troca_modelos enable row level security;
alter table troca_modelo_avarias enable row level security;
alter table troca_config enable row level security;
alter table avaliacoes_trade_in enable row level security;
alter table avaliacoes_trade_in_alteracoes enable row level security;

drop policy if exists "troca_avarias_staff_all" on troca_avarias;
create policy "troca_avarias_staff_all" on troca_avarias for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "troca_modelos_staff_all" on troca_modelos;
create policy "troca_modelos_staff_all" on troca_modelos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "troca_modelo_avarias_staff_all" on troca_modelo_avarias;
create policy "troca_modelo_avarias_staff_all" on troca_modelo_avarias for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "troca_config_staff_all" on troca_config;
create policy "troca_config_staff_all" on troca_config for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "avaliacoes_trade_in_staff_all" on avaliacoes_trade_in;
create policy "avaliacoes_trade_in_staff_all" on avaliacoes_trade_in for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "avaliacoes_trade_in_alteracoes_staff_all" on avaliacoes_trade_in_alteracoes;
create policy "avaliacoes_trade_in_alteracoes_staff_all" on avaliacoes_trade_in_alteracoes for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

do $$ begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'avaliacoes_trade_in'
  ) then
    alter publication supabase_realtime add table avaliacoes_trade_in;
  end if;
end $$;

notify pgrst, 'reload schema';
