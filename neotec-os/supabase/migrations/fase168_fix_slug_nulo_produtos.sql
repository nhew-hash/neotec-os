-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 168 (Supabase / PostgreSQL)
-- Achado: inserção direta por SQL (estoque comercial) não gerou slug,
-- ficou null — link da loja virava literalmente "/loja/produto/null".
-- Corrige os dados existentes E adiciona gatilho pra nunca mais
-- acontecer, não importa como o produto for criado daqui pra frente
-- (SQL direto, formulário, importação, qualquer caminho).
-- ============================================================================

create extension if not exists unaccent;

-- Corrige os produtos que já ficaram com slug nulo.
update produtos
set slug = lower(regexp_replace(regexp_replace(unaccent(nome), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(id::text, 1, 6)
where slug is null;

-- Gatilho — gera slug automático sempre que um produto for criado sem
-- um. Funciona pra QUALQUER caminho de criação (SQL direto, app,
-- importação em massa), não só o código da aplicação.
create or replace function gerar_slug_produto_automatico()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(regexp_replace(regexp_replace(unaccent(new.nome), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(new.id::text, 1, 6);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gerar_slug_produto on produtos;
create trigger trg_gerar_slug_produto
  before insert on produtos
  for each row
  execute function gerar_slug_produto_automatico();

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 168
-- ============================================================================
