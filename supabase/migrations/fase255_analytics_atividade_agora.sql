-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 255 (Supabase / PostgreSQL)
-- Correções da auditoria de "Atividade agora" (Analytics da Loja):
--   - utm_medium/utm_campaign eram capturados na URL e depois descartados
--     (só utm_source ia pro banco) — adiciona as colunas que faltavam em
--     `loja_sessoes` pra guardar os três.
--   - novo tipo de evento `product_view`: o pageview automático (dispara
--     em toda navegação) nunca carrega produto_id/aparelho_id — só sabe
--     a URL. Página de produto agora dispara ESSE evento adicional, com
--     o produto atribuído, sem misturar com a contagem geral de
--     pageviews (que já estava correta) e sem depender de ordem entre
--     componentes React pra evitar contagem duplicada.
--   - `loja_eventos.lacrado_modelo_id`: item lacrado nunca tinha como
--     ser atribuído (nem view, nem add-to-cart) — não tem FK pra
--     `produtos` nem `aparelhos`, só pra `catalogo_lacrados_modelos`,
--     que não tinha coluna nenhuma pra isso. Sem essa coluna, lacrado
--     ficaria pra sempre invisível em "Atividade agora"/"Produtos mais
--     acessados", mesmo sendo item de topo do catálogo (nav principal).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'loja_sessoes' and column_name = 'utm_medium') then
    alter table loja_sessoes add column utm_medium text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'loja_sessoes' and column_name = 'utm_campaign') then
    alter table loja_sessoes add column utm_campaign text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'loja_eventos' and column_name = 'lacrado_modelo_id') then
    alter table loja_eventos add column lacrado_modelo_id uuid references catalogo_lacrados_modelos(id) on delete set null;
  end if;
end $$;

alter type tipo_evento_loja add value if not exists 'product_view';

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 255
-- ============================================================================
