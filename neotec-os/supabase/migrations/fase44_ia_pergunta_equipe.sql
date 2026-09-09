-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 44 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: em vez de só pausar quando não sabe responder, a
-- IA manda uma pergunta pro WhatsApp pessoal do vendedor/dono — e usa a
-- resposta dele pra continuar atendendo o cliente original, sem o dono
-- precisar entrar no sistema.
-- ============================================================================

alter table configuracoes_ia
  add column if not exists numero_vendedor_perguntas text;

comment on column configuracoes_ia.numero_vendedor_perguntas is
  'WhatsApp pessoal de quem a IA manda pergunta quando não sabe responder o cliente. Formato local, sem 55 (mesmo padrão de clientes.whatsapp). Null = comportamento antigo (só pausa e cria follow-up, sem perguntar a ninguém).';

create type status_pergunta_equipe as enum ('aguardando', 'respondida', 'expirada');

create table ia_perguntas_equipe (
  id uuid primary key default gen_random_uuid(),
  conversa_cliente_id uuid not null references whatsapp_conversas(id) on delete cascade,
  card_id uuid references crm_cards(id) on delete set null,
  pergunta text not null,
  resposta text,
  status status_pergunta_equipe not null default 'aguardando',
  created_at timestamptz not null default now(),
  respondida_em timestamptz
);

create index idx_ia_perguntas_equipe_status on ia_perguntas_equipe(status, created_at);
create index idx_ia_perguntas_equipe_conversa on ia_perguntas_equipe(conversa_cliente_id);

alter table ia_perguntas_equipe enable row level security;

create policy "ia_perguntas_equipe_staff_select" on ia_perguntas_equipe for select
  using (
    exists (select 1 from whatsapp_conversas wc where wc.id = ia_perguntas_equipe.conversa_cliente_id and wc.loja_id = current_user_loja_id())
  );

-- Escrita só pelo backend (Service Role) — a IA cria a pergunta, e o
-- processamento do webhook marca como respondida quando o vendedor
-- responde. Mesma lógica de sempre pra infraestrutura de sistema.

alter publication supabase_realtime add table ia_perguntas_equipe;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 44
-- ============================================================================
