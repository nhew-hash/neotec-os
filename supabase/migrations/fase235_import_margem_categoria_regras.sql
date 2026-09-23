-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 235 (Supabase / PostgreSQL)
-- Importação automática de fornecedores — regra de lucro por categoria
-- (+ condição). Pedido do dono: precisa de margem diferente pra Mac,
-- iPhone lacrado, iPad, Android, e iPhone SEMINOVO com faixa por valor
-- ("até certo valor" = exatamente o tipo 'faixa' que `regras_lucro` já
-- suporta pros seminovos manuais desde antes).
--
-- Em vez de reinventar faixa de preço aqui, `import_margem_categoria`
-- ganha `regra_lucro_id` — aponta pra uma regra JÁ CADASTRADA em
-- `regras_lucro` (fixo/percentual/faixa, a mesma tela de sempre em
-- /estoque/seminovos/regras-lucro). `valor_fixo`/`percentual` diretos
-- continuam existindo como atalho pra quando não vale a pena criar uma
-- regra reaproveitável só pra 1 categoria.
--
-- `condicao` diferencia "iPhone lacrado" de "iPhone seminovo" dentro da
-- MESMA categoria (`smartphones_iphone`) — '' (vazio) = regra vale pra
-- qualquer condição (ou categorias sem condição, tipo acessório/áudio).
-- ============================================================================

alter table import_margem_categoria add column if not exists condicao text not null default '';
alter table import_margem_categoria add column if not exists regra_lucro_id uuid references regras_lucro(id) on delete set null;

do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'import_margem_categoria'::regclass
    and contype = 'u'
    and array_length(conkey, 1) = 1
    and conkey[1] = (select attnum from pg_attribute where attrelid = 'import_margem_categoria'::regclass and attname = 'categoria_slug');
  if nome_constraint is not null then
    execute format('alter table import_margem_categoria drop constraint %I', nome_constraint);
  end if;
end $$;

create unique index if not exists idx_import_margem_categoria_slug_condicao
  on import_margem_categoria (categoria_slug, condicao);

notify pgrst, 'reload schema';
