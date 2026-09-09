-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 160 (Supabase / PostgreSQL)
-- Campo pra diferenciar aparelho que está FISICAMENTE na loja
-- (entrega na hora) de aparelho que está com fornecedor fora da
-- cidade (não dá pra retirar na hora). Uma tela mostra as duas listas
-- separadas, mas é o mesmo campo — muda manual, sem duplicar cadastro.
-- ============================================================================

create type localizacao_estoque_tipo as enum ('loja_fisica', 'fornecedor');

alter table aparelhos add column if not exists localizacao_estoque localizacao_estoque_tipo not null default 'loja_fisica';

comment on column aparelhos.localizacao_estoque is 'Onde o aparelho está fisicamente agora — "loja_fisica" (entrega na hora) ou "fornecedor" (fora da cidade, não retira na hora). Muda manual, staff decide.';

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
  disponivel_loja_virtual, fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado, mostrar_trade_in, retirar_em,
  localizacao_estoque
from aparelhos;

grant select on vw_aparelhos_seguro to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 160
-- ============================================================================
