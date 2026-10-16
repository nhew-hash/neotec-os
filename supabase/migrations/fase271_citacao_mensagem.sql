-- Fase 271 — Resposta citando mensagem (o "responder" do WhatsApp)
-- O cliente responde citando uma pergunta nossa ("o carinho" → "O que você mais
-- sente falta nele?"). Antes a citação se perdia e a resposta ficava sem sentido.
-- Só acrescenta duas colunas opcionais.
-- Reverter: alter table whatsapp_mensagens drop column if exists citacao_texto, drop column if exists citacao_whatsapp_id;
alter table whatsapp_mensagens add column if not exists citacao_texto text, add column if not exists citacao_whatsapp_id text;
