-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 203 (Supabase / PostgreSQL)
-- Completa o schema da Iara (agente comercial de IA da Prostec) — o
-- código de src/services/prostec/whatsapp/prostec-bot.service.ts já
-- referenciava todas essas tabelas/campos, mas a migração que os
-- criava nunca tinha sido escrita. Sem isso, TODA chamada real (bot
-- respondendo, conectando WhatsApp, mudando modo) falharia em runtime.
-- ============================================================================

alter table integracoes_whatsapp_prostec add column if not exists qr_code text;
alter table integracoes_whatsapp_prostec add column if not exists modo_operacao text not null default 'teste' check (modo_operacao in ('teste', 'piloto', 'autonomo'));
alter table integracoes_whatsapp_prostec add column if not exists iara_ativa boolean not null default true;
alter table integracoes_whatsapp_prostec add column if not exists mensagens_hoje integer not null default 0;
alter table integracoes_whatsapp_prostec add column if not exists ultimo_erro text;

alter table integracoes_whatsapp_prostec drop constraint if exists integracoes_whatsapp_prostec_status_check;
alter table integracoes_whatsapp_prostec add constraint integracoes_whatsapp_prostec_status_check
  check (status in ('conectado', 'desconectado', 'erro', 'aguardando_qr', 'conectando'));

alter table prostec_conversas add column if not exists propriedade text not null default 'ai' check (propriedade in ('ai', 'human', 'paused'));
alter table prostec_conversas add column if not exists nao_contatar boolean not null default false;
alter table prostec_conversas add column if not exists exige_atencao boolean not null default false;
alter table prostec_conversas add column if not exists motivo_atencao text;
alter table prostec_conversas add column if not exists ultima_intencao text;
alter table prostec_conversas add column if not exists proxima_acao text;
alter table prostec_conversas add column if not exists objecoes jsonb not null default '[]'::jsonb;
alter table prostec_conversas add column if not exists resumo_contexto text;

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'prostec_conversas' and column_name = 'bot_ativo') then
    update prostec_conversas set propriedade = case when bot_ativo then 'ai' else 'human' end where propriedade = 'ai';
  end if;
end $$;

create table if not exists prostec_oferta (
  id text primary key default 'default',
  produto text not null default 'Site institucional profissional',
  preco numeric(12,2) not null default 1497,
  formas_pagamento text not null default 'PIX ou cartão de crédito, em até 12x',
  prazo_entrega text not null default '10 dias úteis após aprovação do conteúdo',
  incluso text not null default 'Design profissional, até 5 páginas, formulário de contato, otimização para celular',
  nao_incluso text not null default 'Fotos profissionais, redação de texto, domínio e hospedagem (orientamos como contratar)',
  desconto_maximo_automatico_pct numeric(5,2) not null default 0,
  parcelamento_maximo integer not null default 12,
  updated_at timestamptz not null default now()
);
insert into prostec_oferta (id) values ('default') on conflict (id) do nothing;

create trigger trg_prostec_oferta_updated_at
  before update on prostec_oferta
  for each row execute function set_updated_at();

create table if not exists prostec_ia_decisoes (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references prostec_conversas(id) on delete cascade,
  mensagem_recebida text not null,
  intent text,
  decisao text,
  acao text,
  created_at timestamptz not null default now()
);
create index if not exists idx_prostec_ia_decisoes_conversa on prostec_ia_decisoes(conversa_id, created_at desc);

alter table prostec_oferta enable row level security;
alter table prostec_ia_decisoes enable row level security;

create policy "prostec_oferta_staff" on prostec_oferta for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_ia_decisoes_staff" on prostec_ia_decisoes for select using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 203
-- ============================================================================
