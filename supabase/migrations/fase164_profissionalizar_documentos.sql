-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 164 (Supabase / PostgreSQL)
-- Revisão completa de todos os templates de impressão, pedido
-- explícito de deixar tudo com escopo profissional.
--
-- BUGS ACHADOS E CORRIGIDOS:
-- - orçamento (a4) e venda (cupom) usavam {{itens}} (escapado) em vez
--   de {{{itens}}} (HTML cru) — a formatação apareceria como texto
--   literal com tags visíveis, nunca funcionou direito.
-- - CNPJ real adicionado em TODOS os documentos (nenhum tinha antes,
--   só o comprovante de aparelho da Fase 158).
-- ============================================================================

-- OS — cupom: adiciona CNPJ
update documento_templates
set conteudo_html = replace(
  conteudo_html,
  '<div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center;">OS {{numero_documento}}</div>',
  '<div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center; font-size:9px;">CNPJ 37.091.751/0001-70</div>
  <div style="text-align:center;">OS {{numero_documento}}</div>'
)
where tipo_documento = 'os' and formato = 'cupom' and padrao = true;

-- Orçamento (a4) — corrige o bug de {{itens}} escapado + adiciona CNPJ/endereço no cabeçalho
update documento_templates
set conteudo_html = replace(
  replace(
    conteudo_html,
    '<div style="font-size: 13px;">{{itens}}</div>',
    '<div style="font-size: 13px;">{{{itens}}}</div>'
  ),
  '<div style="font-size: 20px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>',
  '<div style="font-size: 18px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>
    <div style="font-size: 10px; color: #666;">CNPJ 37.091.751/0001-70 — Araguari, MG</div>'
)
where tipo_documento = 'orcamento' and formato = 'a4' and padrao = true;

-- Venda (cupom) — corrige o bug de {{itens}} escapado + adiciona CNPJ
update documento_templates
set conteudo_html = replace(
  replace(
    conteudo_html,
    '<div>{{itens}}</div>',
    '<div>{{{itens}}}</div>'
  ),
  '<div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center;">Venda {{numero_documento}}</div>',
  '<div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center; font-size:9px;">CNPJ 37.091.751/0001-70</div>
  <div style="text-align:center;">Venda {{numero_documento}}</div>'
)
where tipo_documento = 'venda' and formato = 'cupom' and padrao = true;

-- Recibo (cupom) — adiciona CNPJ
update documento_templates
set conteudo_html = replace(
  conteudo_html,
  '<div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center;">RECIBO</div>',
  '<div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center; font-size:9px;">CNPJ 37.091.751/0001-70</div>
  <div style="text-align:center;">RECIBO</div>'
)
where tipo_documento = 'recibo' and formato = 'cupom' and padrao = true;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 164
-- ============================================================================
