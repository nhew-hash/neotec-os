-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 13 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: distinguir senha numérica de padrão de desenho no
-- checklist de recebimento da OS.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_senha_aparelho') then
    create type tipo_senha_aparelho as enum ('numerica', 'desenho');
  end if;
end $$;

alter table checklist_os
  add column if not exists senha_tipo tipo_senha_aparelho;

comment on column checklist_os.senha_tipo is
  'Tipo da senha informada: numérica/alfanumérica normal, ou padrão de desenho (Android). Junto com senha_valor.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 13
-- ============================================================================
