-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 32 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: CRM inteligente — lead score, detecção de objeção,
-- resumo automático por IA, sequência de follow-up de recuperação
-- (D+0/D+1/D+3/D+5), motivo de perda.
--
-- DECISÃO: a sequência de follow-up precisa de checagem periódica
-- automática (cron), não só reagir a evento — "algumas horas depois do
-- cliente parar de responder" não é algo que dispara sozinho, precisa de
-- alguém perguntando "já passou tempo suficiente?" de tempos em tempos.
-- Implementado como Vercel Cron Job chamando uma rota de API (ver
-- src/app/api/cron/follow-up-vendas/route.ts e vercel.json).
-- ============================================================================

alter table crm_cards
  add column if not exists score integer not null default 0,
  add column if not exists objecao text,
  add column if not exists resumo_ia text,
  add column if not exists proxima_acao text,
  add column if not exists status_recuperacao text not null default 'ativo'
    check (status_recuperacao in ('ativo', 'sem_retorno', 'recuperado')),
  add column if not exists sequencia_followup integer not null default 0,
  add column if not exists ultima_resposta_cliente_em timestamptz,
  add column if not exists perdido boolean not null default false,
  add column if not exists motivo_perda text;

comment on column crm_cards.sequencia_followup is
  '0 = nenhum follow-up de recuperação enviado ainda. 1 = D+0 enviado. 2 = D+1 enviado. 3 = D+3 enviado. 4 = D+5 enviado (sequência encerrada, vira sem_retorno).';
comment on column crm_cards.status_recuperacao is
  'ativo = sequência de follow-up pode continuar rodando. sem_retorno = passou pelas 4 tentativas sem resposta, IA para de insistir. recuperado = cliente respondeu depois de pelo menos um follow-up ter sido enviado.';

-- Log de cada mudança de score, com o motivo — é o que permite mostrar
-- "+10 perguntou preço" na tela, não só o número final.
create table crm_score_eventos (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references crm_cards(id) on delete cascade,
  motivo text not null,
  pontos integer not null,
  created_at timestamptz not null default now()
);

create index idx_crm_score_eventos_card on crm_score_eventos(card_id);

alter table crm_score_eventos enable row level security;

create policy "crm_score_eventos_staff_select" on crm_score_eventos for select
  using (
    exists (select 1 from crm_cards c where c.id = crm_score_eventos.card_id and c.loja_id = current_user_loja_id())
  );

-- Inserção só pelo backend (Service Role, chamado pela IA de atendimento
-- e pelo cron de follow-up) — sem policy de INSERT pra usuário comum,
-- mesma lógica já usada em whatsapp_logs e ia_logs.

alter publication supabase_realtime add table crm_score_eventos;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 32
-- ============================================================================
