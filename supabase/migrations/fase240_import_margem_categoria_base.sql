-- ============================================================================
-- NEOTEC OS — FASE 240: Base rápida de margem por categoria (importação)
--
-- Pedido do dono: mexer no lucro categoria por categoria tava muito
-- trabalhoso do zero — botar uma BASE qualquer pra já funcionar, e ele
-- ajusta depois direto na tela (Importação > Margem por categoria).
--
-- Valores passados por ele (22/09/2026):
--   Mac 400 · iPad 400 · Android 400 · Relógio 400
--   iPhone por faixa de valor: até 2000 → 400, até 3000 → 450,
--   até 4500 → 600, até 6000 → 680, até 7900 → 800, acima disso → 800
--
-- "Android" cobre os 3 slugs de smartphone Android (Samsung, Xiaomi,
-- outras marcas) + tablets Android — todos com a mesma margem fixa de
-- partida; edite cada um separado se quiser diferenciar depois.
--
-- Idempotente: valores fixos usam "on conflict do nothing" na
-- constraint (categoria_slug, condicao) da fase235; a regra de faixa do
-- iPhone só é criada se ainda não existir uma com esse nome (não roda
-- de novo nem duplica faixas).
-- ============================================================================

-- 1) Categorias com margem fixa simples (condicao='' = vale pra qualquer
--    condição daquela categoria, ex: lacrado e seminovo)
insert into import_margem_categoria (categoria_slug, condicao, valor_fixo) values
  ('computadores_macbook', '', 400),
  ('tablets_ipad', '', 400),
  ('tablets_android', '', 400),
  ('smartphones_samsung', '', 400),
  ('smartphones_xiaomi', '', 400),
  ('smartphones_outras_marcas', '', 400),
  ('smartwatches_apple_watch', '', 400)
on conflict (categoria_slug, condicao) do nothing;

-- 2) iPhone por faixa de valor (reaproveita regras_lucro, mesmo motor
--    das faixas de seminovo manual)
do $$
declare
  v_regra_id uuid;
begin
  select id into v_regra_id from regras_lucro where nome = 'iPhone - faixa por valor (base import)';

  if v_regra_id is null then
    insert into regras_lucro (nome, tipo) values ('iPhone - faixa por valor (base import)', 'faixa')
    returning id into v_regra_id;

    insert into regras_lucro_faixas (regra_id, valor_ate, lucro, ordem) values
      (v_regra_id, 2000, 400, 0),
      (v_regra_id, 3000, 450, 1),
      (v_regra_id, 4500, 600, 2),
      (v_regra_id, 6000, 680, 3),
      (v_regra_id, 7900, 800, 4),
      (v_regra_id, null, 800, 5); -- acima de 7900, mesma margem da faixa anterior
  end if;

  insert into import_margem_categoria (categoria_slug, condicao, regra_lucro_id)
  values ('smartphones_iphone', '', v_regra_id)
  on conflict (categoria_slug, condicao) do update set regra_lucro_id = excluded.regra_lucro_id;
end $$;

notify pgrst, 'reload schema';
