-- ============================================================================
-- NEOTEC OS — FASE 246: consolidação do menu da loja em 10 "lugares"
--
-- Pedido do dono (24/09/2026, briefing detalhado): reduzir o menu da
-- loja de volta pra 10 categorias fixas, juntando Fone+Caixa de
-- som+Microfone em "Áudio" e Robô aspirador+Triciclo+Notebook em
-- "Eletrônicos e Mobilidade" (a Fase 245 tinha criado uma categoria pra
-- cada, granular demais pro gosto do dono).
--
-- Só adiciona valor novo no enum — nunca remove (Postgres não permite
-- de forma simples, e não precisa: os valores antigos da Fase 245
-- ficam parados sem uso, inofensivos).
--
-- IMPORTANTE: rode este migration SOZINHO primeiro (regra do Postgres
-- pra ALTER TYPE ADD VALUE não valer na mesma transação em que foi
-- criado). Só depois rode o SQL de reparo, em execução separada.
-- ============================================================================

alter type categoria_produto add value if not exists 'audio';
alter type categoria_produto add value if not exists 'eletronicos_mobilidade';
