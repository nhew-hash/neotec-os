-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 257 (Supabase / PostgreSQL)
-- Editar preço de venda diretamente pela listagem do Estoque (produtos
-- e aparelhos), com permissão granular pra vendedor e histórico de
-- alteração. Aditivo — não mexe em `custo`, `estoque_minimo`,
-- `movimentos_estoque` nem em nenhuma venda já registrada.
--
-- RLS hoje: só admin/gerente têm UPDATE em `produtos`/`aparelhos`
-- (`fase3_multitenant_cargos_timeline.sql`) — vendedor não tem nenhum
-- acesso de escrita nessas tabelas. Pra vendedor conseguir editar
-- preço com permissão concedida, a Server Action de update usa o
-- client de service role (mesmo padrão já usado em outros pontos do
-- Central de Cadastro), só depois de checar a permissão abaixo — nunca
-- expondo update livre via RLS ampliada (o que arriscaria dar acesso a
-- outras colunas além de `preco_venda`).
-- ============================================================================

-- Permissão granular — mesmo formato de `crediario_permissoes_usuario`
-- (Fase 206), só que escopada ao módulo Estoque. Não é um sistema de
-- permissões paralelo: é o mesmo padrão já usado no Crediário,
-- reaplicado aqui porque não existe nada genérico entre módulos.
create table if not exists estoque_permissoes_usuario (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  permissao text not null check (permissao in ('editar_preco')),
  concedido_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, permissao)
);

alter table estoque_permissoes_usuario enable row level security;

drop policy if exists "estoque_permissoes_usuario_admin" on estoque_permissoes_usuario;
create policy "estoque_permissoes_usuario_admin" on estoque_permissoes_usuario for all
  using (current_user_cargo() = 'admin');

-- Cada usuário precisa conseguir ler a própria permissão (pra Server
-- Action checar "eu tenho essa permissão?" com o client de sessão,
-- sem precisar de service role só pra essa leitura).
drop policy if exists "estoque_permissoes_usuario_self_select" on estoque_permissoes_usuario;
create policy "estoque_permissoes_usuario_self_select" on estoque_permissoes_usuario for select
  using (usuario_id = auth.uid());

-- Histórico de alteração de preço — molde de `crediario_auditoria`
-- (Fase 206), mas dedicado (entidade fixa produto/aparelho) em vez de
-- genérico, porque aqui o "antes/depois" é sempre a mesma coisa: preço.
create table if not exists preco_venda_historico (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  entidade text not null check (entidade in ('produto', 'aparelho')),
  entidade_id uuid not null,
  nome_exibido text not null,
  preco_anterior numeric,
  preco_novo numeric not null,
  usuario_id uuid references usuarios(id),
  usuario_nome text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_preco_venda_historico_entidade on preco_venda_historico(entidade, entidade_id, criado_em desc);

alter table preco_venda_historico enable row level security;

-- Mesmo público que já vê a tabela de Estoque hoje (admin/gerente/
-- vendedor/técnico/caixa) — preço de venda não é dado sensível como
-- custo, então não precisa do bracket mais restrito de `podeVerCusto`.
drop policy if exists "preco_venda_historico_staff_select" on preco_venda_historico;
create policy "preco_venda_historico_staff_select" on preco_venda_historico for select
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor', 'tecnico', 'caixa') and loja_id = current_user_loja_id());

-- Insert sempre via service role (a Server Action já validou permissão
-- antes de chegar aqui), mas mantém uma policy coerente com o padrão
-- do projeto em vez de depender só do bypass do service role.
drop policy if exists "preco_venda_historico_staff_insert" on preco_venda_historico;
create policy "preco_venda_historico_staff_insert" on preco_venda_historico for insert
  with check (loja_id = current_user_loja_id());

notify pgrst, 'reload schema';
