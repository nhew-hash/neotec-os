-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 28 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: IA de Atendimento — responde cliente automaticamente
-- pelo WhatsApp, com regras de escalonamento pra humano.
--
-- DECISÃO: "IA ativa" (configuracoes_ia.ativo) e "IA respondendo cliente
-- sozinha" são coisas DIFERENTES — uma loja pode querer a IA ligada só
-- pra interpretar cotação, sem deixar ela falar com cliente ainda. Por
-- isso `atendimento_automatico_ativo` é uma flag própria, não reaproveita
-- o `ativo` geral.
-- ============================================================================

alter table configuracoes_ia
  add column if not exists atendimento_automatico_ativo boolean not null default false;

alter table whatsapp_conversas
  add column if not exists ia_pausada boolean not null default false;

comment on column whatsapp_conversas.ia_pausada is
  'Quando true, a IA de atendimento não responde mais nesta conversa — pausada manualmente (botão "Parar robô") ou automaticamente (escalonamento: cliente quente, pediu humano, IA não sabia responder, ou um humano da equipe mandou mensagem).';

alter table whatsapp_mensagens
  add column if not exists enviado_por_ia boolean not null default false;

comment on column whatsapp_mensagens.enviado_por_ia is
  'true quando a mensagem foi gerada e enviada pela IA de atendimento, não por um humano da equipe — usado pra mostrar o selo visual no chat.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 28
-- ============================================================================
