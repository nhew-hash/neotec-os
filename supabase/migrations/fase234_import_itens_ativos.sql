-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 234 (Supabase / PostgreSQL)
-- Importação automática de fornecedores (Fase 230) — "wiring" ao banco.
--
-- O motor de diff (aplicacao-diff.ts, puro) compara a lista nova com os
-- "itens ATIVOS anteriores do MESMO escopo (fornecedor + tipo_lista)".
-- As tabelas de estoque existentes (aparelhos, produtos,
-- catalogo_lacrados_variantes) têm formatos bem diferentes entre si e
-- nenhuma delas guarda todos os campos que compõem a chave de identidade
-- do item (armazenamento, RAM, conectividade, NFC, tamanho, GPS/cellular,
-- bateria, cidade...). Em vez de forçar esse formato dentro delas,
-- `import_itens_ativos` é a fonte de verdade do ESCOPO da importação
-- automática — o que está fisicamente visível pro cliente (aparelho
-- seminovo, variante de lacrado, produto genérico) é uma PROJEÇÃO
-- derivada dela, nunca o contrário.
-- ============================================================================

create table if not exists import_itens_ativos (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null,
  tipo_lista text not null,
  chave_identidade text not null,

  categoria_slug text not null references import_categorias(slug),
  marca text,
  modelo_canonico text not null,
  modelo_reconhecido boolean not null default true,
  condicao text, -- 'Lacrado' | 'Seminovo' | null (genérico sem condição)
  armazenamento_gb integer,
  ram_gb integer,
  ram_possivel_typo boolean not null default false,
  conectividade text, -- '4G' | '5G' | null
  nfc boolean not null default false,
  tamanho_mm integer,
  gps_cellular text, -- 'GPS' | 'GPS+Cellular' | null
  cor text not null,
  cor_base text not null,
  cor_emoji_origem text,
  bateria_pct integer,
  cidade text,
  garantia text,
  quantidade integer not null default 1,
  tags text[] not null default '{}',
  preco_fornecedor numeric(12,2) not null,
  linha_origem text,

  -- Projeção pro que o cliente/staff realmente vê — só um dos três é
  -- preenchido, dependendo de `condicao` (ver aplicacao.service.ts).
  -- `aparelho_ids` é ARRAY porque uma linha da lista do fornecedor pode
  -- vir com `quantidade` > 1 (várias unidades físicas idênticas, sem
  -- IMEI individual informado pelo fornecedor) — cada unidade vira um
  -- `aparelhos` próprio (IMEI null, completado depois na chegada
  -- física), mas todas ficam ligadas a esta MESMA linha lógica do diff.
  aparelho_ids uuid[] not null default '{}',
  variante_lacrado_id uuid references catalogo_lacrados_variantes(id) on delete set null,
  produto_id uuid references produtos(id) on delete set null,

  ativo boolean not null default true,
  desativado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Só pode haver 1 item ATIVO por escopo+chave (a chave já inclui
-- fornecedor — mantido em coluna própria só pra facilitar filtro/index).
create unique index if not exists idx_import_itens_ativos_escopo_chave
  on import_itens_ativos (fornecedor, tipo_lista, chave_identidade) where ativo;
create index if not exists idx_import_itens_ativos_escopo
  on import_itens_ativos (fornecedor, tipo_lista) where ativo;

drop trigger if exists trg_import_itens_ativos_updated_at on import_itens_ativos;
create trigger trg_import_itens_ativos_updated_at before update on import_itens_ativos for each row execute function set_updated_at();

alter table import_itens_ativos enable row level security;
drop policy if exists "import_itens_ativos_staff_all" on import_itens_ativos;
create policy "import_itens_ativos_staff_all" on import_itens_ativos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

notify pgrst, 'reload schema';
