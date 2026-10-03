-- Fase 262 — Meta Pixel + Conversions API (CAPI)
--
-- Objetivo: preparar o Analytics do Neotec OS pra alimentar o Meta Ads
-- com eventos de e-commerce reais (não só visita). Esta migração NÃO
-- cria um banco paralelo de dados pessoais pra Meta — só adiciona as
-- colunas de atribuição (fbc/fbp) que já faltavam em `loja_sessoes`
-- (utm_*/fbclid/gclid já existiam desde a fase 259) e CONGELA a
-- atribuição no momento em que o pedido é criado, dentro da própria
-- `pedidos_loja` — sem isso, se o cliente voltasse ao site depois de
-- comprar (ou a sessão expirasse), o Purchase enviado pra Meta via CAPI
-- perderia a campanha que de fato trouxe a venda.
--
-- Não removemos nem alteramos nenhuma coluna existente.

-- `loja_eventos.tipo` é o enum `tipo_evento_loja` (criado na fase 183,
-- estendido em fases seguintes) — "lead" e "contact" são os dois tipos
-- novos que a Fase 262 precisa pra registrar os eventos Lead/Contact do
-- Meta Pixel também na camada interna de tracking, não só mandar pra Meta.
alter type tipo_evento_loja add value if not exists 'lead';
alter type tipo_evento_loja add value if not exists 'contact';

alter table loja_sessoes add column if not exists fbc text;
alter table loja_sessoes add column if not exists fbp text;

alter table pedidos_loja add column if not exists utm_source text;
alter table pedidos_loja add column if not exists utm_medium text;
alter table pedidos_loja add column if not exists utm_campaign text;
alter table pedidos_loja add column if not exists utm_content text;
alter table pedidos_loja add column if not exists utm_term text;
alter table pedidos_loja add column if not exists fbclid text;
alter table pedidos_loja add column if not exists fbc text;
alter table pedidos_loja add column if not exists fbp text;
alter table pedidos_loja add column if not exists sessao_uid text;

comment on column pedidos_loja.fbc is 'Cookie _fbc (ou derivado do fbclid) no momento da criação do pedido — fonte pro Advanced Matching do Meta CAPI no evento Purchase. Congelado aqui, não lido de novo da sessão depois.';
comment on column pedidos_loja.fbp is 'Cookie _fbp no momento da criação do pedido — mesmo motivo do fbc acima.';
comment on column pedidos_loja.sessao_uid is 'UID da loja_sessoes que originou este pedido — liga o pedido à sessão de navegação (UTMs, origem) sem duplicar esses dados aqui além do necessário.';
