-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 223 (Supabase / PostgreSQL)
-- Prostec deixa de vender só "site" — a Iara passa a ter um catálogo de
-- produtos (site, catálogo digital, robô de automação, CRM, link na
-- bio) em vez de uma única linha fixa em prostec_oferta. Também
-- adiciona o interruptor + trava de segurança pro bot já entrar em
-- ação sozinho depois de uma busca de prospecção (antes exigia clique
-- manual por lead).
--
-- prostec_oferta é mantida (não apagada) só por segurança — o código
-- para de ler dela a partir desta fase, mas nada é perdido se algo
-- precisar ser conferido depois.
-- ============================================================================

create table if not exists prostec_produtos (
  id text primary key, -- slug estável: 'site', 'catalogo_digital', 'robo_chat', 'crm', 'link_bio'
  nome text not null,
  descricao_curta text not null default '',
  quando_recomendar text not null default '',
  preco numeric(12,2) not null default 0,
  tipo_cobranca text not null default 'unico' check (tipo_cobranca in ('unico', 'mensal')),
  formas_pagamento text not null default '',
  prazo_entrega text not null default '',
  incluso text not null default '',
  nao_incluso text not null default '',
  desconto_maximo_automatico_pct numeric(5,2) not null default 0,
  parcelamento_maximo integer not null default 1,
  ativo boolean not null default true,
  ordem integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_prostec_produtos_updated_at on prostec_produtos;
create trigger trg_prostec_produtos_updated_at
  before update on prostec_produtos
  for each row execute function set_updated_at();

-- Semeia o catálogo padrão (idempotente — só insere o que ainda não existe).
-- Se já existir uma oferta configurada manualmente em prostec_oferta,
-- usa ela pros dados do produto 'site' em vez do valor fixo, pra não
-- perder nenhuma customização que o operador já tinha feito.
insert into prostec_produtos (id, nome, descricao_curta, quando_recomendar, preco, tipo_cobranca, formas_pagamento, prazo_entrega, incluso, nao_incluso, desconto_maximo_automatico_pct, parcelamento_maximo, ativo, ordem)
select
  'site',
  coalesce(o.produto, 'Site institucional profissional'),
  'Site próprio, com domínio, otimizado pra celular e feito pra aparecer no Google.',
  'Empresa não tem site nenhum — é sempre a primeira sugestão pra quem só tem rede social ou nem isso.',
  coalesce(o.preco, 1497),
  'unico',
  coalesce(o.formas_pagamento, 'PIX ou cartão de crédito, em até 12x'),
  coalesce(o.prazo_entrega, '10 dias úteis após aprovação do conteúdo'),
  coalesce(o.incluso, 'Design profissional, até 5 páginas, formulário de contato, otimização para celular'),
  coalesce(o.nao_incluso, 'Fotos profissionais, redação de texto, domínio e hospedagem (orientamos como contratar)'),
  coalesce(o.desconto_maximo_automatico_pct, 0),
  coalesce(o.parcelamento_maximo, 12),
  true,
  1
from (select 1) dummy
left join prostec_oferta o on o.id = 'default'
on conflict (id) do nothing;

insert into prostec_produtos (id, nome, descricao_curta, quando_recomendar, preco, tipo_cobranca, formas_pagamento, prazo_entrega, incluso, nao_incluso, desconto_maximo_automatico_pct, parcelamento_maximo, ativo, ordem) values
('catalogo_digital', 'Catálogo digital',
 'Catálogo online dos produtos/serviços com fotos e preços, pra mandar o link no WhatsApp em vez de ficar tirando foto e digitando preço um por um.',
 'Empresa vende produto físico/serviço com variedade (loja, oficina, salão, restaurante) e hoje manda catálogo por foto solta no WhatsApp ou Instagram.',
 697, 'unico', 'PIX ou cartão de crédito, em até 6x', '5 dias úteis após receber a lista de produtos/preços',
 'Catálogo online com fotos, preços e categorias, link único pra compartilhar, atualização inclusa no primeiro mês',
 'Fotos profissionais dos produtos, integração com carrinho de compra/pagamento online',
 0, 6, true, 2),
('robo_chat', 'Robô de automação de atendimento (WhatsApp)',
 'Assistente automático no WhatsApp que responde as perguntas repetidas (horário, endereço, preço, disponibilidade) e já filtra quem tá pronto pra falar com um humano.',
 'Empresa recebe bastante mensagem repetida no WhatsApp/Instagram (clínica, oficina, restaurante com delivery, escola) e perde tempo respondendo sempre a mesma coisa.',
 297, 'mensal', 'Assinatura mensal, PIX ou cartão recorrente', '7 dias úteis pra configurar os fluxos e testar com a empresa',
 'Respostas automáticas configuradas pro negócio, horário de funcionamento, transferência pra humano quando necessário, relatório mensal de conversas',
 'Integração com sistemas internos da empresa (ERP próprio, agenda de terceiros) — sob consulta',
 0, 1, true, 3),
('crm', 'CRM de vendas',
 'Sistema simples pra organizar cliente, negociação e follow-up — pra parar de perder venda porque esqueceu de retornar alguém.',
 'Empresa já vende bem e tem equipe de atendimento/vendas, mas controla cliente em caderno, planilha solta ou na memória.',
 197, 'mensal', 'Assinatura mensal, PIX ou cartão recorrente', '5 dias úteis pra configurar e treinar a equipe',
 'Cadastro de clientes/negociações, funil de vendas, lembretes de follow-up, até 3 usuários',
 'Usuários extras além de 3 (cobrado à parte), integração com ERP externo',
 0, 1, true, 4),
('link_bio', 'Página de link na bio',
 'Página única de link (tipo Linktree) com a cara da empresa, pra colocar no lugar do link genérico na bio do Instagram.',
 'Empresa é ativa no Instagram (tem perfil, posta com frequência) mas não tem site nem página própria de link.',
 297, 'unico', 'PIX ou cartão de crédito, em até 3x', '3 dias úteis após aprovação do conteúdo',
 'Página com a identidade visual da empresa, botões pra WhatsApp/Instagram/catálogo/endereço, domínio próprio opcional',
 'Design de logo do zero, fotos profissionais',
 0, 3, true, 5)
on conflict (id) do nothing;

-- Qual produto a conversa/lead está focada agora (pra propostas e
-- relatórios) — nullable, nunca obrigatório (Iara pode ainda não ter
-- decidido).
alter table prostec_leads add column if not exists produto_interesse text references prostec_produtos(id) on delete set null;

-- Auto-início do bot após uma busca de prospecção encontrar empresas
-- novas — antes exigia clique manual "mandar pra Iara" em cada lead.
-- limite_auto_inicio_por_busca é uma trava de segurança: manda no
-- máximo N primeiras-mensagens por execução de busca, pra não disparar
-- uma rajada gigante de mensagens idênticas de uma vez (risco real de o
-- WhatsApp marcar o número como spam).
alter table integracoes_whatsapp_prostec add column if not exists auto_iniciar_bot_apos_busca boolean not null default true;
alter table integracoes_whatsapp_prostec add column if not exists limite_auto_inicio_por_busca integer not null default 15;

alter table prostec_produtos enable row level security;

drop policy if exists "prostec_produtos_staff" on prostec_produtos;
create policy "prostec_produtos_staff" on prostec_produtos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor_prostec'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 223
-- ============================================================================
