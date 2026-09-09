-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 66 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: separação total entre Lacrados e Seminovos.
--
-- LACRADOS: catálogo mestre (não representa estoque físico — representa
-- os modelos que a loja PODE vender via fornecedor). Modelo → várias
-- Variantes (cor × armazenamento), cada variante com quantidade
-- própria. Quantidade 0 = variante não aparece pro cliente.
--
-- SEMINOVOS: continua sendo a tabela `aparelhos` já existente (unidade
-- individual, IMEI, já tinha cor/memória/bateria/condição) — só
-- ganhou os 2 campos que faltavam pro que foi pedido (peças
-- substituídas, observações). Não duplica estrutura.
-- ============================================================================

create table catalogo_lacrados_modelos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  marca text not null default 'Apple',
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_catalogo_lacrados_modelos_ordem on catalogo_lacrados_modelos(loja_id, ordem);

create trigger trg_catalogo_lacrados_modelos_updated_at
  before update on catalogo_lacrados_modelos
  for each row execute function set_updated_at();

create table catalogo_lacrados_variantes (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references catalogo_lacrados_modelos(id) on delete cascade,
  cor text not null,
  armazenamento text not null,
  quantidade integer not null default 0,
  preco_venda numeric(12,2),
  ativo boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (modelo_id, cor, armazenamento)
);

create index idx_catalogo_lacrados_variantes_modelo on catalogo_lacrados_variantes(modelo_id);

create trigger trg_catalogo_lacrados_variantes_updated_at
  before update on catalogo_lacrados_variantes
  for each row execute function set_updated_at();

-- Extensão da tabela de seminovos já existente — nada foi recriado.
alter table aparelhos
  add column if not exists pecas_substituidas text[] not null default '{}',
  add column if not exists observacoes text;

comment on column aparelhos.pecas_substituidas is
  'Peças trocadas nesse aparelho seminovo — valores esperados: tela, bateria, carcaca. Array vazio = nenhuma substituição.';

alter table catalogo_lacrados_modelos enable row level security;
alter table catalogo_lacrados_variantes enable row level security;

create policy "catalogo_lacrados_modelos_staff_all" on catalogo_lacrados_modelos for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());

create policy "catalogo_lacrados_variantes_staff_all" on catalogo_lacrados_variantes for all
  using (
    exists (select 1 from catalogo_lacrados_modelos m where m.id = catalogo_lacrados_variantes.modelo_id and m.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente', 'vendedor')
  );

-- ---- Leitura pública (loja, sem sessão) ----
-- Só modelo com pelo menos 1 variante com quantidade > 0 aparece —
-- "o cliente nunca poderá selecionar uma variante sem estoque".
create or replace function listar_lacrados_modelos_publico()
returns table (id uuid, nome text, marca text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct m.id, m.nome, m.marca
  from catalogo_lacrados_modelos m
  join catalogo_lacrados_variantes v on v.modelo_id = m.id
  where m.ativo = true and v.ativo = true and v.quantidade > 0
  order by m.nome;
$$;

grant execute on function listar_lacrados_modelos_publico() to anon, authenticated;

create or replace function listar_lacrados_variantes_publico(p_modelo_id uuid)
returns table (id uuid, cor text, armazenamento text, quantidade integer, preco_venda numeric)
language sql
stable
security definer
set search_path = public
as $$
  select id, cor, armazenamento, quantidade, preco_venda
  from catalogo_lacrados_variantes
  where modelo_id = p_modelo_id and ativo = true and quantidade > 0
  order by armazenamento, cor;
$$;

grant execute on function listar_lacrados_variantes_publico(uuid) to anon, authenticated;

alter publication supabase_realtime add table catalogo_lacrados_modelos;
alter publication supabase_realtime add table catalogo_lacrados_variantes;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 66
-- ============================================================================
