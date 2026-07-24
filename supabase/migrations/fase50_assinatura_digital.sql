-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 50 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: assinatura digital — captura via canvas (mouse,
-- touch, tablet — tudo funciona com o mesmo componente, não precisa de
-- hardware específico). Desativada por padrão
-- (configuracoes_ia.assinatura_digital_habilitada, já criada na Fase 46).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('assinaturas', 'assinaturas', false)
on conflict (id) do nothing;

create type tipo_assinante_documento as enum ('cliente', 'tecnico');

create table assinaturas_digitais (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  tipo_documento tipo_documento_impressao not null,
  referencia_id uuid not null,
  tipo_assinante tipo_assinante_documento not null,
  caminho_storage text not null,
  usuario_id uuid references usuarios(id),
  criado_em timestamptz not null default now()
);

create index idx_assinaturas_digitais_referencia on assinaturas_digitais(tipo_documento, referencia_id);

alter table assinaturas_digitais enable row level security;

create policy "assinaturas_digitais_staff_all" on assinaturas_digitais for all
  using (loja_id = current_user_loja_id());

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 50
-- ============================================================================
