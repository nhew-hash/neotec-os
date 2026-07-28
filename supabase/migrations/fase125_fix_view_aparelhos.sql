-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 125 (Supabase / PostgreSQL)
-- `vw_aparelhos_seguro` nunca foi atualizada desde a Fase 6 — faltavam
-- TODAS as colunas adicionadas depois (fotos, disponivel_loja_virtual,
-- banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado).
-- Isso fazia `aparelho.fotos` vir `undefined` na tela de detalhe do
-- aparelho, quebrando o componente de upload de foto (.map() em
-- undefined) e derrubando a página inteira.
-- ============================================================================

-- `vw_produtos_seguro` tinha a MESMA lacuna — faltavam visivel_loja,
-- slug, descricao_loja, preco_antigo, selos_manuais, fotos, e os
-- campos mais recentes (banco de imagens, cashback, preço líquido).
drop view if exists vw_produtos_seguro;

create view vw_produtos_seguro as
select
  id, categoria, marca, modelo, nome, descricao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  estoque_minimo,
  status, created_at, updated_at,
  visivel_loja, slug, descricao_loja, preco_antigo, selos_manuais,
  fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado
from produtos;

grant select on vw_produtos_seguro to authenticated;

notify pgrst, 'reload schema';

drop view if exists vw_aparelhos_seguro;

create view vw_aparelhos_seguro as
select
  id, produto_id, imei, numero_serie, cor, memoria, bateria, condicao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  case when current_user_cargo() = 'admin' then preco_minimo else null end as preco_minimo,
  preco_sugerido,
  fornecedor, origem_entrada, investidor_id, consignacao_id,
  status, cliente_origem_id, data_entrada, updated_at,
  pecas_substituidas, observacoes, preco_antigo,
  tela_original, face_id_ok, true_tone_ok, video_url,
  disponivel_loja_virtual, fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado
from aparelhos;

grant select on vw_aparelhos_seguro to authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 125
-- ============================================================================
