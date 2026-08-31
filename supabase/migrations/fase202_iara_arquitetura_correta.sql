-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 202 (Supabase / PostgreSQL)
-- CORREÇÃO DE ARQUITETURA: o WhatsApp da Prostec (Fase 201) foi
-- construído usando Meta Cloud API oficial — a loja usa Bridge externo
-- + Baileys (QR Code). Ajustando pra usar a MESMA arquitetura, como
-- pedido explicitamente. Via ALTER (nunca DROP) — mesmo a tabela
-- provavelmente vazia (WhatsApp nunca foi testado com credencial
-- real, confirmado na auditoria), o padrão deste projeto é migração
-- sempre aditiva.
-- ============================================================================

alter table integracoes_whatsapp_prostec drop constraint if exists integracoes_whatsapp_prostec_status_check;
alter table integracoes_whatsapp_prostec add constraint integracoes_whatsapp_prostec_status_check
  check (status in ('desconectado', 'aguardando_qr', 'conectando', 'conectado', 'erro'));

alter table integracoes_whatsapp_prostec add column if not exists provider text not null default 'whatsapp_web';
alter table integracoes_whatsapp_prostec add column if not exists session_id text;
alter table integracoes_whatsapp_prostec add column if not exists qr_code text;
alter table integracoes_whatsapp_prostec add column if not exists mensagens_hoje integer not null default 0;
alter table integracoes_whatsapp_prostec add column if not exists ultimo_erro text;
alter table integracoes_whatsapp_prostec add column if not exists modo_operacao text not null default 'teste' check (modo_operacao in ('teste', 'piloto', 'autonomo'));
alter table integracoes_whatsapp_prostec add column if not exists iara_ativa boolean not null default true;

-- Campos da Meta Cloud (phone_number_id, access_token) ficam — não
-- fazem mal existir sem uso, e evita quebrar código que ainda
-- referencie a coluna durante a transição.
comment on column integracoes_whatsapp_prostec.phone_number_id is 'Obsoleto — arquitetura mudou pra Bridge/QR Code (Fase 202). Mantido só pra não quebrar migração histórica.';
comment on column integracoes_whatsapp_prostec.access_token is 'Obsoleto — ver phone_number_id.';

-- ============================================================================
-- Memória de conversa — pedido explícito: a Iara não pode analisar só
-- a última mensagem. Contexto persistente por conversa, não por
-- chamada de IA. Expande prostec_conversas (não duplica
-- prostec_mensagens, que já guarda o histórico bruto).
-- ============================================================================

alter table prostec_conversas add column if not exists propriedade text not null default 'ai' check (propriedade in ('ai', 'human', 'paused'));
alter table prostec_conversas add column if not exists resumo_contexto text;
alter table prostec_conversas add column if not exists ultima_intencao text;
alter table prostec_conversas add column if not exists proxima_acao text;
alter table prostec_conversas add column if not exists objecoes jsonb not null default '[]'::jsonb;
alter table prostec_conversas add column if not exists follow_up_motivo text;
alter table prostec_conversas add column if not exists proximo_followup_em timestamptz;
alter table prostec_conversas add column if not exists exige_atencao boolean not null default false;
alter table prostec_conversas add column if not exists motivo_atencao text;
alter table prostec_conversas add column if not exists nao_contatar boolean not null default false;

-- ============================================================================
-- Log de decisões da Iara — pedido explícito, seção 24 do documento.
-- Auditável: "por que a Iara fez isso".
-- ============================================================================

create table if not exists prostec_ia_decisoes (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references prostec_conversas(id) on delete cascade,
  mensagem_recebida text,
  intent text,
  decisao text not null,
  acao text,
  modelo text,
  tokens_entrada integer,
  tokens_saida integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_prostec_ia_decisoes_conversa on prostec_ia_decisoes(conversa_id, created_at desc);

alter table prostec_ia_decisoes enable row level security;
create policy "prostec_ia_decisoes_staff" on prostec_ia_decisoes for select using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_ia_decisoes_insert" on prostec_ia_decisoes for insert with check (true);

-- ============================================================================
-- Oferta comercial — fonte única de verdade. Pedido explícito: nunca
-- deixar preço espalhado em prompt.
-- ============================================================================

create table if not exists prostec_oferta (
  id text primary key default 'default',
  produto text not null default 'Site institucional profissional',
  preco numeric(12,2) not null default 1497,
  formas_pagamento text not null default 'PIX ou cartão, em até 12x',
  prazo_entrega text not null default '15 dias úteis',
  incluso text not null default 'Design responsivo, até 5 páginas, formulário de contato, hospedagem no primeiro ano',
  nao_incluso text not null default 'Domínio próprio (opcional, à parte), conteúdo fotográfico profissional',
  desconto_maximo_automatico_pct numeric(5,2) not null default 10,
  parcelamento_maximo integer not null default 12,
  updated_at timestamptz not null default now()
);
insert into prostec_oferta (id) values ('default') on conflict (id) do nothing;

alter table prostec_oferta enable row level security;
create policy "prostec_oferta_staff_select" on prostec_oferta for select using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));
create policy "prostec_oferta_admin_write" on prostec_oferta for all using (current_user_cargo() in ('admin', 'gerente'));

-- ============================================================================
-- Regras automáticas configuráveis — pedido explícito (seção 17).
-- Descritivas (nome/condição/ação em texto), não um motor de regras
-- genérico executável — isso seria um projeto à parte. A automação de
-- verdade (o QUE cada regra faz) fica no código do orquestrador,
-- essas linhas documentam e permitem ativar/desativar cada uma.
-- ============================================================================

create table if not exists prostec_regras_automacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  condicao text not null,
  acao text not null,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table prostec_regras_automacao enable row level security;
create policy "prostec_regras_automacao_staff" on prostec_regras_automacao for all using (current_user_cargo() in ('admin', 'gerente'));

insert into prostec_regras_automacao (nome, condicao, acao) values
  ('Priorizar leads quentes', 'score >= 80 e não possui site e possui telefone', 'Marcar como prioridade máxima na fila de contato'),
  ('Assumir conversa que respondeu', 'lead respondeu pela primeira vez', 'Iara assume a conversa automaticamente'),
  ('Apresentar oferta ao perguntar preço', 'cliente perguntou preço/valor', 'Iara apresenta a oferta cadastrada'),
  ('Gerar proposta sob pedido', 'cliente pediu a proposta', 'Iara gera e envia o link da proposta'),
  ('Registrar motivo de recusa', 'cliente recusou', 'Marcar lead como perdido com motivo'),
  ('Respeitar pedido de não contato', 'cliente pediu pra não receber mais mensagem', 'Marcar conversa como não_contatar, nunca mais enviar automaticamente'),
  ('Escalar negociação fora do limite', 'desconto pedido acima do limite configurado', 'Pausar negociação automática e notificar operador'),
  ('Pausar em comportamento inesperado', 'IA não conseguiu classificar a intenção com confiança', 'Marcar conversa como exige_atencao, aguardar operador')
on conflict do nothing;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 202
-- ============================================================================
