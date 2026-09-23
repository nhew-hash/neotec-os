-- ============================================================================
-- NEOTEC OS — FASE 243: categoria "Notebook" na importação automática
--
-- Pedido do dono (23/09/2026): reconhecer mais tipos de produto nas
-- listas de fornecedor. A maioria (Perfume, Caixa de som, Tablet,
-- Smartwatch, Fone, Triciclo elétrico, Robô aspirador) já existia no
-- catálogo (`import_categorias`, Fase 230) — só faltava generalizar o
-- reconhecimento de marca no código (feito nesta mesma fase, sem
-- migration). "Notebook" (não-Apple — MacBook já tinha categoria
-- própria) é a única categoria que realmente não existia.
-- ============================================================================

insert into import_categorias (slug, nome, parent_id, ordem)
select 'computadores_notebook', 'Notebook', p.id, 2
from import_categorias p
where p.slug = 'computadores'
on conflict (slug) do nothing;

-- Margem base pra categoria nova, mesmo padrão da Fase 240 (valor de
-- partida — edite em Importação > Margem por categoria quando quiser).
insert into import_margem_categoria (categoria_slug, condicao, valor_fixo) values
  ('computadores_notebook', '', 400)
on conflict (categoria_slug, condicao) do nothing;

notify pgrst, 'reload schema';
