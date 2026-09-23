-- ============================================================================
-- NEOTEC OS — FASE 245 (correção): novos valores no enum categoria_produto
--
-- `produtos.categoria` é um ENUM (`categoria_produto`), não texto livre
-- como o comentário antigo em código dizia — descoberto ao rodar o SQL
-- de reparo em produção (erro 42883 "operator does not exist:
-- categoria_produto = text"). A Fase 245 adicionou 9 categorias novas na
-- loja pública (src/components/loja/categorias.ts); este migration
-- adiciona os valores correspondentes no enum do banco.
--
-- IMPORTANTE: rode este migration SOZINHO primeiro (ele precisa
-- confirmar/commitar antes de qualquer outro comando usar os valores
-- novos — regra do Postgres pra ALTER TYPE ADD VALUE). Só depois rode o
-- SQL de reparo (reparo-categorias-loja-fase245.sql) numa segunda
-- execução separada.
-- ============================================================================

alter type categoria_produto add value if not exists 'smartphone';
alter type categoria_produto add value if not exists 'tablet';
alter type categoria_produto add value if not exists 'notebook';
alter type categoria_produto add value if not exists 'fone';
alter type categoria_produto add value if not exists 'caixa_de_som';
alter type categoria_produto add value if not exists 'microfone';
alter type categoria_produto add value if not exists 'perfume';
alter type categoria_produto add value if not exists 'robo_aspirador';
alter type categoria_produto add value if not exists 'triciclo_eletrico';
