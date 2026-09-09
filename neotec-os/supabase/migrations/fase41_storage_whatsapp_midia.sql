-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 41 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: bucket de Storage pra mídia do WhatsApp (fotos
-- recebidas de cliente, áudios gravados e enviados pela equipe).
--
-- DECISÃO: bucket PRIVADO, não público. Todo acesso passa por link
-- assinado (URL temporária, gerada sob demanda) — nunca por URL fixa
-- pública. É conversa de cliente, não deveria ser acessível por link
-- direto sem controle.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', false)
on conflict (id) do nothing;

-- Upload e leitura só via Service Role (o Neotec OS faz o upload em
-- nome do sistema, nunca direto do navegador do cliente/staff) — mesma
-- lógica de infraestrutura já usada em outros lugares do projeto
-- (whatsapp_logs, ia_logs): sem policy pra usuário comum, só o backend
-- mexe aqui.

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 41
-- ============================================================================
