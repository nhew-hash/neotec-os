-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 179 (Supabase / PostgreSQL)
-- Unifica o sistema de follow-up — existiam dois sistemas paralelos
-- (crm_followups, que já aceita card_id OU cliente_id; retornos, uma
-- tabela à parte) misturados numa lista só na tela, causando confusão.
-- Daqui pra frente só existe crm_followups.
-- ============================================================================

-- Garante que a tabela aceita o formato que o código já espera
-- (card_id opcional, cliente_id como alternativa) — protege mesmo que
-- essa migração seja aplicada num banco que ainda não tenha isso.
alter table crm_followups alter column card_id drop not null;
alter table crm_followups add column if not exists cliente_id uuid references clientes(id) on delete cascade;

insert into crm_followups (cliente_id, usuario_id, data_agendada, motivo, status)
select r.cliente_id, r.usuario_id, r.data_retorno, r.motivo, 'pendente'
from retornos r
where r.status = 'pendente'
  and not exists (
    select 1 from crm_followups f
    where f.cliente_id = r.cliente_id and f.data_agendada = r.data_retorno and f.motivo = r.motivo
  );

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 179
-- ============================================================================
