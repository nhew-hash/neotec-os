-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 252 (Supabase / PostgreSQL)
-- Módulo NeoLoc — camada de negócio + painel (Milestone 2).
--
-- ESCOPO DESTA FASE: só a camada de negócio do NeoLoc (cadastro de
-- dispositivo, vínculo com contrato/cliente, fila de comandos, painel,
-- auditoria). NÃO inclui integração real com NanoMDM/APNs/Apple Business
-- — isso é o Milestone 1/3, que depende de infraestrutura (servidor
-- público, certificado APNs, conta Apple Business) e de um iPhone físico
-- pra validar, nenhum dos dois disponível neste ambiente. O envio de
-- comando aqui fica com status PENDING até a integração real existir.
--
-- REAPROVEITADO, NÃO DUPLICADO (ver ARCHITECTURE.md, seção NeoLoc):
--   - contratos / contratos_modelos / contratos_eventos (Fase 205):
--     o contrato de locação com opção de aquisição JÁ existe aqui.
--   - crediario_parcelas / crediario_regua_cobranca /
--     crediario_cobranca_eventos (Fase 206): parcelas, atraso e régua de
--     cobrança configurável JÁ existem aqui — o NeoLoc só lê esse estado
--     pra decidir quando gerar um comando de bloqueio, nunca duplica.
--   - aparelhos: IMEI, número de série, cor, modelo já existem — NeoLoc
--     só guarda o que é específico de MDM (UDID, iOS, status técnico).
--   - usuarios / cargo_usuario / current_user_loja_id() / current_user_cargo():
--     autenticação, cargos e multi-tenant reaproveitados sem alteração.
-- ============================================================================

-- ============================================================================
-- 1. Configuração por loja (multiempresa desde o início, mesmo rodando
-- hoje dentro de uma loja só — item 21/30 do prompt do módulo).
-- ============================================================================
create table if not exists neoloc_configuracoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null unique references lojas(id),
  dias_cobranca integer not null default 5,
  dias_recolhimento integer not null default 4,
  liberacao_automatica_quitacao boolean not null default false,
  campos_visiveis jsonb not null default '{
    "imei": true, "imei2": true, "numero_serie": true, "modelo": true,
    "capacidade": true, "cor": true, "ios": true, "udid": true,
    "supervisao": true, "activation_lock": true, "ultimo_checkin": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. Dispositivo NeoLoc — 1:1 com `aparelhos`. Guarda só o que é técnico
-- de MDM; nunca duplica IMEI/serial/modelo/cor, que já vivem em
-- `aparelhos`. `status_mdm` é ORTOGONAL a `aparelhos.status_crediario`:
-- um é estado técnico do aparelho (visto pelo MDM), o outro é estado de
-- cobrança (visto pelo Crediário) — exigência explícita do prompt
-- original do NeoLoc (item 28: não misturar estado de contrato, de
-- dispositivo e de comando).
-- ============================================================================
create table if not exists neoloc_dispositivos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id),
  aparelho_id uuid not null unique references aparelhos(id),
  contrato_id uuid references contratos(id),
  cliente_id uuid references clientes(id),
  udid text,
  imei2 text,
  ios_versao text,
  status_mdm text not null default 'nao_matriculado' check (status_mdm in (
    'nao_matriculado', 'pendente_matricula', 'matriculado', 'removido', 'erro_matricula'
  )),
  supervisionado boolean,
  activation_lock text check (activation_lock in ('desconhecido', 'ativo', 'inativo')) default 'desconhecido',
  ultimo_checkin timestamptz,
  observacoes text,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_neoloc_dispositivos_contrato on neoloc_dispositivos(contrato_id);
create index if not exists idx_neoloc_dispositivos_cliente on neoloc_dispositivos(cliente_id);
create index if not exists idx_neoloc_dispositivos_status_mdm on neoloc_dispositivos(status_mdm);

-- ============================================================================
-- 3. Enrollment — histórico de matrícula/liberação do MDM. Um dispositivo
-- pode passar por isso mais de uma vez (matricula → libera → remonta).
-- ============================================================================
create table if not exists neoloc_enrollments (
  id uuid primary key default gen_random_uuid(),
  dispositivo_id uuid not null references neoloc_dispositivos(id) on delete cascade,
  metodo text not null check (metodo in ('automated_device_enrollment', 'apple_configurator', 'manual')),
  status text not null default 'pendente' check (status in ('pendente', 'concluido', 'falhou', 'removido')),
  detalhes jsonb not null default '{}'::jsonb,
  usuario_id uuid references usuarios(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_neoloc_enrollments_dispositivo on neoloc_enrollments(dispositivo_id);

-- ============================================================================
-- 4. Fila de comandos — nunca executada direto do frontend. Idempotente
-- via `command_id` único (item 27/29 do prompt: evita reenvio duplicado
-- por retry de rede).
-- ============================================================================
create table if not exists neoloc_comandos (
  id uuid primary key default gen_random_uuid(),
  command_id text not null unique,
  dispositivo_id uuid not null references neoloc_dispositivos(id) on delete cascade,
  tipo text not null check (tipo in (
    'bloquear', 'desbloquear', 'reiniciar', 'modo_perdido', 'apagar', 'atualizar_informacoes', 'remover_mdm'
  )),
  origem text not null check (origem in ('manual', 'automatico_inadimplencia', 'automatico_quitacao')),
  usuario_id uuid references usuarios(id),
  motivo text,
  contrato_id uuid references contratos(id),
  status text not null default 'pending' check (status in (
    'pending', 'sent', 'acknowledged', 'success', 'failed', 'expired'
  )),
  resultado text,
  erro text,
  tentativas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_neoloc_comandos_dispositivo on neoloc_comandos(dispositivo_id, created_at desc);
create index if not exists idx_neoloc_comandos_status on neoloc_comandos(status) where status in ('pending', 'sent');

-- ============================================================================
-- 5. Auditoria específica do NeoLoc — no mesmo espírito de
-- `contratos_eventos`/`crediario_auditoria`, mas para ações de
-- dispositivo (bloquear, desbloquear, apagar etc.), nunca apagável por
-- usuário comum (item 24 do prompt).
-- ============================================================================
create table if not exists neoloc_eventos (
  id uuid primary key default gen_random_uuid(),
  dispositivo_id uuid not null references neoloc_dispositivos(id) on delete cascade,
  comando_id uuid references neoloc_comandos(id),
  tipo text not null,
  usuario_id uuid references usuarios(id),
  motivo text,
  resultado text,
  created_at timestamptz not null default now()
);
create index if not exists idx_neoloc_eventos_dispositivo on neoloc_eventos(dispositivo_id, created_at desc);

drop trigger if exists trg_neoloc_configuracoes_updated_at on neoloc_configuracoes;
create trigger trg_neoloc_configuracoes_updated_at before update on neoloc_configuracoes for each row execute function set_updated_at();
drop trigger if exists trg_neoloc_dispositivos_updated_at on neoloc_dispositivos;
create trigger trg_neoloc_dispositivos_updated_at before update on neoloc_dispositivos for each row execute function set_updated_at();
drop trigger if exists trg_neoloc_comandos_updated_at on neoloc_comandos;
create trigger trg_neoloc_comandos_updated_at before update on neoloc_comandos for each row execute function set_updated_at();

-- ============================================================================
-- RLS — mesmo padrão de Contratos/Crediário (role-based via
-- current_user_cargo(); loja_id já é filtrado no cadastro do dispositivo,
-- que referencia aparelhos/clientes já escopados por loja).
-- ============================================================================
alter table neoloc_configuracoes enable row level security;
alter table neoloc_dispositivos enable row level security;
alter table neoloc_enrollments enable row level security;
alter table neoloc_comandos enable row level security;
alter table neoloc_eventos enable row level security;

drop policy if exists "neoloc_configuracoes_admin" on neoloc_configuracoes;
create policy "neoloc_configuracoes_admin" on neoloc_configuracoes for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

drop policy if exists "neoloc_dispositivos_staff" on neoloc_dispositivos;
create policy "neoloc_dispositivos_staff" on neoloc_dispositivos for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico') and loja_id = current_user_loja_id());

drop policy if exists "neoloc_enrollments_staff" on neoloc_enrollments;
create policy "neoloc_enrollments_staff" on neoloc_enrollments for all
  using (current_user_cargo() in ('admin', 'gerente', 'tecnico'));

drop policy if exists "neoloc_comandos_staff" on neoloc_comandos;
create policy "neoloc_comandos_staff" on neoloc_comandos for all
  using (current_user_cargo() in ('admin', 'gerente', 'tecnico'));

drop policy if exists "neoloc_eventos_staff" on neoloc_eventos;
create policy "neoloc_eventos_staff" on neoloc_eventos for select
  using (current_user_cargo() in ('admin', 'gerente', 'tecnico'));
create policy "neoloc_eventos_insert" on neoloc_eventos for insert with check (true);

-- ============================================================================
-- Semeia a configuração padrão para lojas que já existem, sem sobrescrever
-- quem já tiver (idempotente).
-- ============================================================================
insert into neoloc_configuracoes (loja_id)
select id from lojas
where not exists (select 1 from neoloc_configuracoes where neoloc_configuracoes.loja_id = lojas.id)
on conflict (loja_id) do nothing;
