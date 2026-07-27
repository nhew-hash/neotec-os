-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 104 (Supabase / PostgreSQL)
-- Banco Central de Imagens — grupos deduplicados (marca > modelo > cor
-- > armazenamento), fotos ficam ligadas ao GRUPO, não a cada produto.
-- Trocar as fotos de um grupo atualiza automaticamente todo produto
-- vinculado a ele.
--
-- Compatibilidade: `produtos.fotos`/`aparelhos.fotos`/
-- `catalogo_lacrados_modelos.fotos` (Fase 102/103) continuam
-- existindo — funcionam como override manual quando não tem grupo
-- vinculado, ou quando você quer uma foto específica além das do
-- banco central. Nada quebra do que já foi cadastrado.
-- ============================================================================

create table banco_imagens_grupos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  marca text not null,
  modelo text not null,
  cor text,               -- null = grupo sem cor específica (ex: acessório genérico)
  armazenamento text,     -- só relevante quando o armazenamento muda a aparência (raro) — normalmente null
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (loja_id, marca, modelo, cor, armazenamento)
);

create trigger trg_banco_imagens_grupos_updated_at
  before update on banco_imagens_grupos
  for each row execute function set_updated_at();

create table banco_imagens_fotos (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references banco_imagens_grupos(id) on delete cascade,
  url text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_banco_imagens_fotos_grupo on banco_imagens_fotos(grupo_id, ordem);

-- Vínculo opcional — quando preenchido, a EXIBIÇÃO na loja prioriza as
-- fotos do grupo sobre o array `fotos` direto do produto.
alter table produtos add column if not exists banco_imagens_grupo_id uuid references banco_imagens_grupos(id) on delete set null;
alter table aparelhos add column if not exists banco_imagens_grupo_id uuid references banco_imagens_grupos(id) on delete set null;
alter table catalogo_lacrados_modelos add column if not exists banco_imagens_grupo_id uuid references banco_imagens_grupos(id) on delete set null;

alter table banco_imagens_grupos enable row level security;
alter table banco_imagens_fotos enable row level security;

create policy "banco_imagens_grupos_staff_all" on banco_imagens_grupos for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());
create policy "banco_imagens_fotos_staff_all" on banco_imagens_fotos for all
  using (exists (select 1 from banco_imagens_grupos g where g.id = banco_imagens_fotos.grupo_id and g.loja_id = current_user_loja_id()));

-- Leitura pública — a loja precisa buscar as fotos do grupo vinculado, sem sessão.
create or replace function listar_fotos_grupo_publico(p_grupo_id uuid)
returns table (url text, ordem integer)
language sql stable security definer set search_path = public
as $$
  select url, ordem from banco_imagens_fotos where grupo_id = p_grupo_id order by ordem;
$$;
grant execute on function listar_fotos_grupo_publico(uuid) to anon, authenticated;

-- Atualiza as funções públicas de produto pra priorizar as fotos do
-- grupo vinculado (banco central) sobre o array direto do produto —
-- COALESCE com array vazio quando o grupo não tem foto nenhuma ainda,
-- pra não voltar array vazio quando o produto tinha foto própria.
drop function if exists listar_produtos_loja();

create function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[]
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.categoria, p.marca, p.modelo, p.nome, p.descricao_loja, p.preco_venda, p.preco_antigo, p.selos_manuais, p.slug,
    case
      when p.banco_imagens_grupo_id is not null and exists (select 1 from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
        then (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
      else p.fotos
    end as fotos
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo';
$$;
grant execute on function listar_produtos_loja() to anon, authenticated;

drop function if exists buscar_produto_loja(text);

create function buscar_produto_loja(p_slug text)
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[]
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.categoria, p.marca, p.modelo, p.nome, p.descricao_loja, p.preco_venda, p.preco_antigo, p.selos_manuais, p.slug,
    case
      when p.banco_imagens_grupo_id is not null and exists (select 1 from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
        then (select array_agg(f.url order by f.ordem) from banco_imagens_fotos f where f.grupo_id = p.banco_imagens_grupo_id)
      else p.fotos
    end as fotos
  from produtos p
  where p.visivel_loja = true and p.status = 'ativo' and p.slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 104
-- ============================================================================
