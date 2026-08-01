-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 148 (Supabase / PostgreSQL)
-- "Retirar da loja" — imediato (já existe, é só desmarcar
-- visivel_loja/disponivel_loja_virtual) ou agendado (novo — marca uma
-- data/hora, um cron diário confere e despublica sozinho quando chegar
-- a hora).
-- ============================================================================

alter table produtos add column if not exists retirar_em timestamptz;
alter table aparelhos add column if not exists retirar_em timestamptz;

comment on column produtos.retirar_em is 'Se preenchido, o item some da loja sozinho quando chegar essa data/hora (cron diário confere). Null = sem retirada agendada.';
comment on column aparelhos.retirar_em is 'Mesmo campo, nível aparelho.';

drop view if exists vw_produtos_seguro;

create view vw_produtos_seguro as
select
  id, categoria, marca, modelo, nome, descricao,
  preco_venda,
  case when current_user_cargo() = 'admin' then custo else null end as custo,
  estoque_minimo,
  status, created_at, updated_at,
  visivel_loja, slug, descricao_loja, preco_antigo, selos_manuais,
  fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado, mostrar_trade_in, retirar_em
from produtos;

grant select on vw_produtos_seguro to authenticated;

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
  disponivel_loja_virtual, fotos, banco_imagens_grupo_id, cashback_percentual, preco_liquido_desejado, mostrar_trade_in, retirar_em
from aparelhos;

grant select on vw_aparelhos_seguro to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 148
-- ============================================================================
