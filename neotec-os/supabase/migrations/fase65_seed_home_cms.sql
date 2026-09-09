-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 65 (Supabase / PostgreSQL)
-- Semeia o conteúdo que já existia fixo na home (hero, diferenciais,
-- categorias, destaques, banner de trade-in) como dados do CMS — a
-- home não fica vazia depois da Fase 64, só passa a ser editável.
-- ============================================================================

insert into hero_slides (loja_id, titulo, subtitulo, texto_botao, link_botao, prioridade, ativo)
select id, 'iPhone, iPad e acessórios com garantia de verdade',
  'Aparelhos novos e seminovos revisados, com a assistência técnica da Neotec por trás de cada venda.',
  'Ver iPhones disponíveis', '/loja/categoria/iphone', 0, true
from lojas;

insert into home_secoes (loja_id, tipo, ordem, ativo, configuracao)
select id, 'categorias', 1, true, '{}'::jsonb from lojas;

insert into home_secoes (loja_id, tipo, ordem, ativo, configuracao)
select id, 'assistencia', 2, true, jsonb_build_object(
  'itens', jsonb_build_array(
    jsonb_build_object('icone', 'shield-check', 'titulo', 'Garantia de verdade', 'descricao', 'Todo aparelho sai com garantia Neotec, revisado pela nossa assistência técnica.'),
    jsonb_build_object('icone', 'wallet', 'titulo', 'Parcele em até 12x', 'descricao', 'Sem juros, direto na compra — sem burocracia.'),
    jsonb_build_object('icone', 'repeat', 'titulo', 'Troque seu usado', 'descricao', 'Seu aparelho atual pode virar parte do pagamento do novo.'),
    jsonb_build_object('icone', 'wrench', 'titulo', 'Assistência própria', 'descricao', 'A mesma equipe que conserta também revisa cada aparelho vendido.')
  )
) from lojas;

insert into home_secoes (loja_id, tipo, ordem, ativo, configuracao)
select id, 'vitrine_produtos', 3, true, jsonb_build_object('titulo', 'Destaques', 'quantidade', 8) from lojas;

insert into home_secoes (loja_id, tipo, ordem, ativo, configuracao)
select id, 'trade_in', 4, true, jsonb_build_object(
  'titulo', 'Seu aparelho atual pode valer mais do que você imagina',
  'descricao', 'Conta pra gente sobre ele e recebe uma proposta pra usar como parte do pagamento.',
  'texto_botao', 'Avaliar meu aparelho'
) from lojas;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 65
-- ============================================================================
