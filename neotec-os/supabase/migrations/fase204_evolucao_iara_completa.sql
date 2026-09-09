-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 204 (Supabase / PostgreSQL)
-- Fases 1-7 do plano de evolução da Prostec/Iara aprovado — tudo
-- menos Instagram API (fica pra depois, por decisão explícita).
-- ============================================================================

alter table prostec_ia_decisoes add column if not exists tokens_entrada integer;
alter table prostec_ia_decisoes add column if not exists tokens_saida integer;
alter table prostec_ia_decisoes add column if not exists custo_estimado numeric(10,4);
alter table prostec_ia_decisoes add column if not exists desconto_solicitado_pct numeric(5,2);
alter table prostec_ia_decisoes add column if not exists desconto_validado boolean;

create table if not exists prostec_mensagens_processadas (
  message_id text primary key,
  processado_em timestamptz not null default now()
);
create index if not exists idx_prostec_msgs_processadas_data on prostec_mensagens_processadas(processado_em);

create table if not exists prostec_opt_out (
  telefone text primary key,
  motivo text,
  origem text not null default 'cliente_solicitou' check (origem in ('cliente_solicitou', 'manual_staff')),
  created_at timestamptz not null default now()
);

create table if not exists prostec_anomalias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('taxa_erro_ia', 'taxa_opt_out', 'mensagens_duplicadas', 'falha_autenticacao', 'outro')),
  descricao text not null,
  valor_observado numeric,
  limite_configurado numeric,
  pausou_sistema boolean not null default false,
  created_at timestamptz not null default now()
);

alter table integracoes_whatsapp_prostec add column if not exists pausado_automaticamente boolean not null default false;
alter table integracoes_whatsapp_prostec add column if not exists motivo_pausa_automatica text;
alter table integracoes_whatsapp_prostec add column if not exists limite_opt_out_pct numeric(5,2) not null default 15;
alter table integracoes_whatsapp_prostec add column if not exists limite_erro_ia_consecutivo integer not null default 5;

alter table prostec_leads add column if not exists next_best_action text;
alter table prostec_leads add column if not exists next_best_action_motivo text;
alter table prostec_leads add column if not exists next_best_action_calculada_em timestamptz;

create table if not exists prostec_experimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'concluido', 'cancelado')),
  amostra_minima integer not null default 30,
  variante_vencedora text,
  created_at timestamptz not null default now(),
  encerrado_em timestamptz
);

create table if not exists prostec_experimento_variantes (
  id uuid primary key default gen_random_uuid(),
  experimento_id uuid not null references prostec_experimentos(id) on delete cascade,
  nome text not null,
  texto_mensagem text not null,
  enviadas integer not null default 0,
  respondidas integer not null default 0,
  interessadas integer not null default 0,
  vendidas integer not null default 0,
  unique (experimento_id, nome)
);

alter table prostec_leads add column if not exists experimento_variante_id uuid references prostec_experimento_variantes(id);

update prostec_settings set
  segmentos_disponiveis = case when array_length(segmentos_disponiveis, 1) is null or array_length(segmentos_disponiveis, 1) = 0
    then array['Restaurantes','Clínicas','Dentistas','Advogados','Contadores','Imobiliárias','Oficinas','Auto centers','Academias','Salões de beleza','Barbearias','Lojas','Construção','Elétrica','Refrigeração','Empresas de serviços','Hotéis','Pousadas','Escolas','Cursos','Transportadoras','Indústrias','Outros']
    else segmentos_disponiveis end,
  cidades_sugeridas = case when array_length(cidades_sugeridas, 1) is null or array_length(cidades_sugeridas, 1) = 0
    then array['Araguari - MG','Uberlândia - MG','Patrocínio - MG','Uberaba - MG','Araxá - MG']
    else cidades_sugeridas end
where id = 'default';

alter table prostec_mensagens_processadas enable row level security;
alter table prostec_opt_out enable row level security;
alter table prostec_anomalias enable row level security;
alter table prostec_experimentos enable row level security;
alter table prostec_experimento_variantes enable row level security;

drop policy if exists "prostec_mensagens_processadas_service" on prostec_mensagens_processadas;
create policy "prostec_mensagens_processadas_service" on prostec_mensagens_processadas for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "prostec_opt_out_staff" on prostec_opt_out;
create policy "prostec_opt_out_staff" on prostec_opt_out for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

drop policy if exists "prostec_anomalias_staff" on prostec_anomalias;
create policy "prostec_anomalias_staff" on prostec_anomalias for select using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "prostec_experimentos_staff" on prostec_experimentos;
create policy "prostec_experimentos_staff" on prostec_experimentos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

drop policy if exists "prostec_experimento_variantes_staff" on prostec_experimento_variantes;
create policy "prostec_experimento_variantes_staff" on prostec_experimento_variantes for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 204
-- ============================================================================
