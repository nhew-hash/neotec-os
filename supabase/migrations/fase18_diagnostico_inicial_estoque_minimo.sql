-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 18 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Diagnóstico Inicial na OS, e estoque mínimo no
-- catálogo de produtos.
--
-- Modelo de 3 camadas na OS, cada uma com seu momento e responsável:
-- 1) defeito          — o que o CLIENTE relata, capturado na abertura.
-- 2) diagnostico_inicial — impressão técnica de quem RECEBE o aparelho,
--    também na abertura, antes de qualquer desmontagem.
-- 3) diagnostico       — diagnóstico técnico de verdade, depois de abrir
--    o aparelho, capturado numa etapa posterior do fluxo.
-- ============================================================================

alter table ordens_servico
  add column if not exists diagnostico_inicial text;

comment on column ordens_servico.diagnostico_inicial is
  'Impressão técnica de quem recebe o aparelho, capturada na abertura da OS — diferente de `defeito` (relato do cliente) e de `diagnostico` (avaliação técnica após abrir o aparelho).';

-- Estoque mínimo — limite definido manualmente (diferente da quantidade
-- disponível, que continua CALCULADA via movimentos_estoque, nunca
-- armazenada solta, para não repetir o problema de dessincronia que já
-- resolvemos antes).
alter table produtos
  add column if not exists estoque_minimo integer not null default 0;

-- vw_produtos_seguro precisa ser recriada pra incluir o campo novo,
-- mantendo a mesma regra de mascaramento de custo já decidida.
drop view if exists vw_produtos_seguro;
create view vw_produtos_seguro as
select
  id, categoria, marca, modelo, nome, descricao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  estoque_minimo,
  status, created_at, updated_at
from produtos;

grant select on vw_produtos_seguro to authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 18
-- ============================================================================
