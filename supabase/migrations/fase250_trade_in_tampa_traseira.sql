-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 250 (Supabase / PostgreSQL)
-- Trade-in: novo critério "estado da tampa traseira" (4 níveis).
--
-- Já existia a avaria binária 'traseira' (Fase 239, "vidro traseiro
-- trincado ou quebrado") — cobre o nível mais grave. Faltavam os
-- intermediários pedidos: Sem danos / Marcas leves / Marcas fortes /
-- Quebrada. Em vez de mudar o motor (que já é genérico o bastante pra
-- somar qualquer avaria marcada), essa migração só adiciona 2 códigos
-- novos no catálogo — "Sem danos" continua sendo, como sempre, nenhuma
-- avaria marcada.
--
-- Reaproveita o código 'traseira' já existente pra "Quebrada" (preserva
-- o histórico de avaliações antigas — o nome só fica mais claro).
-- ============================================================================

update troca_avarias
set nome = 'Traseira quebrada', descricao = 'Vidro traseiro trincado ou quebrado'
where codigo = 'traseira';

insert into troca_avarias (codigo, nome, descricao, ordem, bloqueia) values
  ('traseira_marcas_leves', 'Traseira — marcas leves', 'Riscos superficiais na tampa traseira, sem quebra', 144, false),
  ('traseira_marcas_fortes', 'Traseira — marcas fortes', 'Amassados ou riscos profundos na tampa traseira, sem quebra', 146, false)
on conflict (codigo) do nothing;

-- Semeia um desconto proporcional por modelo a partir do que já está
-- configurado pra 'traseira' (quebrada) — o admin ajusta depois em
-- Trade-in > Tabela de valores. `on conflict do nothing` torna isso
-- seguro de rodar mais de uma vez e não sobrescreve um ajuste manual
-- feito depois da primeira vez.
insert into troca_modelo_avarias (modelo_id, avaria_codigo, desconto)
select modelo_id, 'traseira_marcas_leves', round(desconto * 0.3, 2)
from troca_modelo_avarias
where avaria_codigo = 'traseira'
on conflict (modelo_id, avaria_codigo) do nothing;

insert into troca_modelo_avarias (modelo_id, avaria_codigo, desconto)
select modelo_id, 'traseira_marcas_fortes', round(desconto * 0.6, 2)
from troca_modelo_avarias
where avaria_codigo = 'traseira'
on conflict (modelo_id, avaria_codigo) do nothing;
