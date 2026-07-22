-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 43 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: catálogo de fotos reutilizáveis (ex: "iPhone 13
-- Preto Seminovo") — equipe ou IA busca pela descrição e manda a foto
-- certa, sem precisar tirar foto nova a cada conversa.
--
-- DECISÃO: bucket PÚBLICO (diferente de whatsapp-media, que é privado).
-- São fotos genéricas de produto, sem dado de cliente nenhum — e
-- precisam de URL estável (não expira) pro Bridge conseguir buscar e
-- mandar a qualquer momento, sem depender de gerar link toda vez.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('catalogo-fotos', 'catalogo-fotos', true)
on conflict (id) do nothing;

create table catalogo_fotos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  descricao text not null,
  caminho_storage text not null,
  usuario_id uuid references usuarios(id),
  created_at timestamptz not null default now()
);

create index idx_catalogo_fotos_descricao on catalogo_fotos using gin (to_tsvector('portuguese', descricao));

alter table catalogo_fotos enable row level security;

create policy "catalogo_fotos_staff_all" on catalogo_fotos for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor') and loja_id = current_user_loja_id());

alter publication supabase_realtime add table catalogo_fotos;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 43
-- ============================================================================
