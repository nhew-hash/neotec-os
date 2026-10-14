-- ============================================================================
-- FASE 267 — Central Comercial: metas e checklists (Fase D da auditoria)
-- NÃO APLICADA EM NENHUM BANCO. ADITIVA. Sem dados semeados: metas e modelos de
-- checklist são cadastrados pelo gerente/dono; nenhuma tela mostra número inventado.
-- ============================================================================

create table if not exists metas_vendas (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null default default_loja_id() references lojas(id),
  usuario_id  uuid references usuarios(id) on delete cascade,   -- NULL = meta da loja
  mes         date not null check (mes = date_trunc('month', mes)::date),
  valor_meta  numeric(12,2) not null check (valor_meta > 0),
  criado_por  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists uq_metas_vendas_loja_mes on metas_vendas (loja_id, mes) where usuario_id is null;
create unique index if not exists uq_metas_vendas_usuario_mes on metas_vendas (loja_id, usuario_id, mes) where usuario_id is not null;

create table if not exists checklist_modelos (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null default default_loja_id() references lojas(id),
  titulo      text not null check (length(trim(titulo)) >= 3),
  descricao   text,
  cargo       text not null,                       -- quem executa: gera uma tarefa por usuário ativo desse cargo
  frequencia  text not null default 'diaria' check (frequencia in ('diaria', 'semanal', 'mensal')),
  dia_semana  smallint check (dia_semana between 0 and 6),   -- 0=domingo; usado quando semanal
  dia_mes     smallint check (dia_mes between 1 and 31),     -- usado quando mensal
  prazo_hora  time not null default '18:00',       -- horário limite (Brasília)
  ativo       boolean not null default true,
  criado_por  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists checklist_tarefas (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null default default_loja_id() references lojas(id),
  modelo_id      uuid references checklist_modelos(id) on delete set null,
  titulo         text not null,                    -- cópia do modelo na data (histórico não muda se o modelo mudar)
  descricao      text,
  data_ref       date not null,
  responsavel_id uuid not null references usuarios(id) on delete cascade,
  prazo          timestamptz not null,
  status         text not null default 'pendente' check (status in ('pendente', 'concluida', 'dispensada')),
  concluida_em   timestamptz,
  concluida_por  uuid references auth.users(id),
  observacao     text,
  created_at     timestamptz not null default now(),
  unique (modelo_id, data_ref, responsavel_id)
);
create index if not exists idx_checklist_tarefas_resp on checklist_tarefas (responsavel_id, data_ref desc, status);
create index if not exists idx_checklist_tarefas_loja on checklist_tarefas (loja_id, data_ref desc, status);

alter table metas_vendas enable row level security;
alter table checklist_modelos enable row level security;
alter table checklist_tarefas enable row level security;

-- Metas: gerente/admin gerenciam; vendedor lê a própria e a da loja.
drop policy if exists "metas_vendas_leitura" on metas_vendas;
create policy "metas_vendas_leitura" on metas_vendas for select
  using (loja_id = current_user_loja_id() and (current_user_cargo() in ('admin', 'gerente') or usuario_id is null or usuario_id = auth.uid()));
drop policy if exists "metas_vendas_gestao" on metas_vendas;
create policy "metas_vendas_gestao" on metas_vendas for all
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'))
  with check (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "checklist_modelos_leitura" on checklist_modelos;
create policy "checklist_modelos_leitura" on checklist_modelos for select using (loja_id = current_user_loja_id());
drop policy if exists "checklist_modelos_gestao" on checklist_modelos;
create policy "checklist_modelos_gestao" on checklist_modelos for all
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'))
  with check (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'));

-- Tarefas: o responsável vê e conclui as suas; gerente/admin veem e ajustam todas da loja.
drop policy if exists "checklist_tarefas_leitura" on checklist_tarefas;
create policy "checklist_tarefas_leitura" on checklist_tarefas for select
  using (loja_id = current_user_loja_id() and (responsavel_id = auth.uid() or current_user_cargo() in ('admin', 'gerente')));
drop policy if exists "checklist_tarefas_conclusao" on checklist_tarefas;
create policy "checklist_tarefas_conclusao" on checklist_tarefas for update
  using (loja_id = current_user_loja_id() and (responsavel_id = auth.uid() or current_user_cargo() in ('admin', 'gerente')))
  with check (loja_id = current_user_loja_id() and (responsavel_id = auth.uid() or current_user_cargo() in ('admin', 'gerente')));
-- INSERT só por função/serviço (geração idempotente do dia); gerente pode criar tarefa avulsa:
drop policy if exists "checklist_tarefas_gestao_insert" on checklist_tarefas;
create policy "checklist_tarefas_gestao_insert" on checklist_tarefas for insert
  with check (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'));

-- Responsável não pode reescrever a tarefa: só status/observação/conclusão.
create or replace function trg_checklist_tarefa_campos_protegidos() returns trigger
language plpgsql as $$
begin
  if current_user_cargo() not in ('admin', 'gerente') then
    if new.titulo is distinct from old.titulo or new.descricao is distinct from old.descricao or new.prazo is distinct from old.prazo
       or new.responsavel_id is distinct from old.responsavel_id or new.data_ref is distinct from old.data_ref or new.modelo_id is distinct from old.modelo_id then
      raise exception 'Você só pode marcar a tarefa como concluída ou escrever uma observação.';
    end if;
    if new.status = 'dispensada' then raise exception 'Somente o gerente pode dispensar uma tarefa.'; end if;
  end if;
  if new.status = 'concluida' and old.status <> 'concluida' then
    new.concluida_em := now();
    new.concluida_por := auth.uid();
  elsif new.status = 'pendente' then
    new.concluida_em := null;
    new.concluida_por := null;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_checklist_tarefas_protegidos on checklist_tarefas;
create trigger trg_checklist_tarefas_protegidos before update on checklist_tarefas
  for each row execute function trg_checklist_tarefa_campos_protegidos();

notify pgrst, 'reload schema';

-- ROLLBACK: drop table if exists checklist_tarefas, checklist_modelos, metas_vendas cascade;
--           drop function if exists trg_checklist_tarefa_campos_protegidos();
