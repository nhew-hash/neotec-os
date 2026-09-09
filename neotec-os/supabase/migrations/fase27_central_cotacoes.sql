-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 27 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Central de Cotações Inteligente.
--
-- DECISÕES DE MODELAGEM:
-- - `cotacoes` é domínio SEPARADO de `produtos`/`aparelhos` (estoque
--   próprio da loja). Cotação representa o que um FORNECEDOR está
--   oferecendo — nunca vira estoque automaticamente, é consultada como
--   referência (preço de mercado), não como inventário da Neotec.
-- - `categoria` e `fornecedor` são TEXT, não enum — a missão pediu
--   explicitamente "projetar pra permitir qualquer categoria" (celular,
--   notebook, tablet, console, acessório, e o que mais surgir), enum
--   exigiria migração toda vez que uma categoria nova aparecesse.
-- - `tipo_produto` em `cotacao_itens` é o mesmo raciocínio — hoje só
--   "celular" é usado de verdade, mas o campo já existe pra notebook/
--   tablet/console/acessório sem precisar alterar a tabela depois.
-- - `mapeamento_emoji_cor` é configurável pela tela, não hard-coded no
--   prompt da IA — "se surgirem novos emojis, permitir cadastro futuro"
--   foi pedido explícito.
-- ============================================================================

create type status_cotacao as enum ('ativa', 'arquivada');

create table cotacoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  fornecedor text not null,
  categoria text not null,
  data_cotacao date not null default current_date,
  status status_cotacao not null default 'ativa',
  observacao text,
  texto_original text not null,
  quantidade_aparelhos integer not null default 0,
  usuario_id uuid references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cotacoes_loja_data on cotacoes(loja_id, data_cotacao desc);
create index idx_cotacoes_fornecedor on cotacoes(fornecedor);
create index idx_cotacoes_categoria on cotacoes(categoria);
create index idx_cotacoes_status on cotacoes(status);

create trigger trg_cotacoes_updated_at
  before update on cotacoes
  for each row execute function set_updated_at();

create table cotacao_itens (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references cotacoes(id) on delete cascade,
  tipo_produto text not null default 'celular',
  modelo text not null,
  armazenamento text,
  cor text,
  bateria_percentual integer,
  preco numeric(12,2) not null,
  quantidade integer not null default 1,
  garantia text,
  observacao text,
  created_at timestamptz not null default now()
);

create index idx_cotacao_itens_cotacao on cotacao_itens(cotacao_id);
create index idx_cotacao_itens_modelo on cotacao_itens(modelo);
create index idx_cotacao_itens_preco on cotacao_itens(preco);

-- Mapeamento emoji → cor, configurável pela tela (Configurações →
-- Cotações). Semente com os emojis já informados na missão original.
create table mapeamento_emoji_cor (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  emoji text not null,
  cor text not null,
  created_at timestamptz not null default now(),
  unique (loja_id, emoji)
);

insert into mapeamento_emoji_cor (emoji, cor) values
  ('⚫️', 'Preto'), ('⚪️', 'Branco'), ('🩶', 'Titânio Natural'),
  ('💜', 'Roxo'), ('💛', 'Dourado'), ('💚', 'Verde'), ('🔵', 'Azul')
on conflict (loja_id, emoji) do nothing;

-- Configuração de prioridade de busca de preço — "1 Estoque, 2 Seminovos,
-- 3 Lacrados, 4 Fornecedores", pedido explicitamente como configurável.
create table prioridade_busca_preco (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id) unique,
  ordem jsonb not null default '["estoque", "seminovos", "lacrados", "fornecedores"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into prioridade_busca_preco (loja_id)
select id from lojas
on conflict (loja_id) do nothing;

create trigger trg_prioridade_busca_preco_updated_at
  before update on prioridade_busca_preco
  for each row execute function set_updated_at();

-- RLS
alter table cotacoes enable row level security;
alter table cotacao_itens enable row level security;
alter table mapeamento_emoji_cor enable row level security;
alter table prioridade_busca_preco enable row level security;

create policy "cotacoes_staff_all" on cotacoes for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());

create policy "cotacao_itens_staff_all" on cotacao_itens for all
  using (
    exists (select 1 from cotacoes c where c.id = cotacao_itens.cotacao_id and c.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

create policy "mapeamento_emoji_cor_staff_select" on mapeamento_emoji_cor for select
  using (loja_id = current_user_loja_id());
create policy "mapeamento_emoji_cor_admin_gerente_write" on mapeamento_emoji_cor for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "prioridade_busca_preco_staff_select" on prioridade_busca_preco for select
  using (loja_id = current_user_loja_id());
create policy "prioridade_busca_preco_admin_gerente_write" on prioridade_busca_preco for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

alter publication supabase_realtime add table cotacoes;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 27
-- ============================================================================
