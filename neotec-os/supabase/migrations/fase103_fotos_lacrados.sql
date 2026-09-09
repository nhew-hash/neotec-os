-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 103 (Supabase / PostgreSQL)
-- Fotos no catálogo mestre de lacrados — por MODELO (ex: "iPhone 17
-- Pro Max"), não por variante de cor/armazenamento. Armazenamento
-- nunca muda a aparência externa, e manter uma foto por combinação de
-- cor×armazenamento seria trabalho redundante pra um ganho visual
-- pequeno — a mesma foto do modelo já serve pra todas as variantes.
-- ============================================================================

alter table catalogo_lacrados_modelos add column if not exists fotos text[] not null default '{}';
comment on column catalogo_lacrados_modelos.fotos is 'URLs públicas no bucket produtos-fotos — a primeira é a capa. Compartilhada entre todas as variantes de cor/armazenamento desse modelo.';

-- Atualiza a função pública que a loja usa pra listar modelos — "drop"
-- antes é obrigatório (mesma razão de sempre: Postgres não deixa
-- "create or replace function" mudar colunas de retorno).
drop function if exists listar_lacrados_modelos_publico();

create function listar_lacrados_modelos_publico()
returns table (id uuid, nome text, marca text, fotos text[])
language sql
stable
security definer
set search_path = public
as $$
  select distinct m.id, m.nome, m.marca, m.fotos
  from catalogo_lacrados_modelos m
  join catalogo_lacrados_variantes v on v.modelo_id = m.id
  where m.ativo = true and v.ativo = true and v.quantidade > 0
  order by m.nome;
$$;

grant execute on function listar_lacrados_modelos_publico() to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 103
-- ============================================================================
