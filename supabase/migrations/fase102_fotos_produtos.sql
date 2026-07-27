-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 102 (Supabase / PostgreSQL)
-- Suporte de verdade a fotos em produtos e aparelhos — hoje a loja
-- mostra só um ícone genérico pra tudo, nenhum item tem foto real.
-- `fotos` é um array de URLs (Storage público) — permite mais de uma
-- foto por item, a primeira da lista é sempre a capa/principal.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('produtos-fotos', 'produtos-fotos', true)
on conflict (id) do nothing;

alter table produtos add column if not exists fotos text[] not null default '{}';
alter table aparelhos add column if not exists fotos text[] not null default '{}';

comment on column produtos.fotos is 'URLs públicas no bucket produtos-fotos — a primeira é a foto de capa.';
comment on column aparelhos.fotos is 'URLs públicas no bucket produtos-fotos — permite foto específica da unidade (ex: marca de uso), além da(s) foto(s) do produto genérico.';

-- Política de storage — qualquer usuário autenticado da loja pode
-- subir/apagar (equipe interna); leitura é sempre pública (a loja
-- mostra a foto sem exigir sessão).
create policy "produtos_fotos_leitura_publica" on storage.objects for select
  using (bucket_id = 'produtos-fotos');
create policy "produtos_fotos_staff_upload" on storage.objects for insert
  with check (bucket_id = 'produtos-fotos' and auth.role() = 'authenticated');
create policy "produtos_fotos_staff_delete" on storage.objects for delete
  using (bucket_id = 'produtos-fotos' and auth.role() = 'authenticated');

-- Atualiza as funções públicas da loja pra devolver fotos também —
-- "drop" antes é obrigatório (Fase 70: Postgres não deixa "create or
-- replace function" mudar as colunas de retorno de uma função
-- "returns table(...)" já existente).
drop function if exists listar_produtos_loja();

create function listar_produtos_loja()
returns table (
  id uuid, categoria text, marca text, modelo text, nome text,
  descricao_loja text, preco_venda numeric, preco_antigo numeric, selos_manuais text[], slug text, fotos text[]
)
language sql stable security definer set search_path = public
as $$
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, preco_antigo, selos_manuais, slug, fotos
  from produtos
  where visivel_loja = true and status = 'ativo';
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
  select id, categoria, marca, modelo, nome, descricao_loja, preco_venda, preco_antigo, selos_manuais, slug, fotos
  from produtos
  where visivel_loja = true and status = 'ativo' and slug = p_slug;
$$;
grant execute on function buscar_produto_loja(text) to anon, authenticated;

drop function if exists listar_aparelhos_disponiveis_loja(uuid);

create function listar_aparelhos_disponiveis_loja(p_produto_id uuid)
returns table (
  id uuid, cor text, memoria text, condicao text, bateria integer, preco_venda numeric,
  pecas_substituidas text[], observacoes text, fotos text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.cor, a.memoria, a.condicao, a.bateria, a.preco_venda, a.pecas_substituidas, a.observacoes, a.fotos
  from aparelhos a
  join produtos p on p.id = a.produto_id
  where a.produto_id = p_produto_id and a.status = 'disponivel' and a.disponivel_loja_virtual = true;
$$;
grant execute on function listar_aparelhos_disponiveis_loja(uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 102
-- ============================================================================
