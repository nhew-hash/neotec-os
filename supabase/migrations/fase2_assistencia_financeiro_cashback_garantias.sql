-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 2 (Supabase / PostgreSQL)
-- Aditivo: não altera nem recria nada da Fase 1 (usuarios, clientes, CRM,
-- produtos, aparelhos, orçamentos, vendas). Roda uma vez, por cima do banco
-- já existente, no SQL Editor do Supabase.
-- Adiciona: Assistência Técnica, Financeiro, Cashback, Garantias.
-- ============================================================================

-- ============================================================================
-- 1. ENUMS NOVOS
-- ============================================================================
create type status_os as enum (
  'recebido', 'diagnostico', 'orcamento', 'aguardando_aprovacao',
  'em_reparo', 'teste', 'pronto', 'entregue'
);

create type tipo_financeiro as enum ('entrada', 'saida');
create type origem_financeiro as enum ('venda', 'os', 'cashback', 'compra_fornecedor', 'despesa', 'outro');
create type tipo_cashback as enum ('credito', 'debito');
create type tipo_garantia as enum ('produto', 'servico');


-- ============================================================================
-- 2. ASSISTÊNCIA TÉCNICA
-- ============================================================================
create table ordens_servico (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid not null references clientes(id),
  aparelho_id uuid references aparelhos(id),
  tecnico_id uuid references usuarios(id),
  defeito text not null,
  diagnostico text,
  valor numeric(12,2),
  status status_os not null default 'recebido',
  garantia_dias integer,
  data_entrada timestamptz not null default now(),
  data_saida timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_os_cliente on ordens_servico(cliente_id);
create index idx_os_status on ordens_servico(status);
create index idx_os_tecnico on ordens_servico(tecnico_id);

create trigger trg_os_updated_at
  before update on ordens_servico
  for each row execute function set_updated_at();

create table pecas_os (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references ordens_servico(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  quantidade integer not null default 1,
  custo numeric(12,2) not null
);

create index idx_pecas_os on pecas_os(os_id);


-- ============================================================================
-- 3. FINANCEIRO
-- ============================================================================
create table financeiro (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  tipo tipo_financeiro not null,
  categoria text not null,
  valor numeric(12,2) not null,
  descricao text,
  origem_tipo origem_financeiro not null default 'outro',
  origem_id uuid,
  usuario_id uuid references usuarios(id),
  data timestamptz not null default now()
);

create index idx_financeiro_data on financeiro(data);
create index idx_financeiro_tipo on financeiro(tipo);
create index idx_financeiro_origem on financeiro(origem_tipo, origem_id);


-- ============================================================================
-- 4. CASHBACK
-- ============================================================================
create table cashback (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo tipo_cashback not null,
  valor numeric(12,2) not null,
  origem text,
  validade date,
  data timestamptz not null default now()
);

create index idx_cashback_cliente on cashback(cliente_id, data);

create view vw_cliente_cashback_saldo as
select
  cliente_id,
  coalesce(sum(case when tipo = 'credito' then valor else -valor end), 0) as saldo
from cashback
where validade is null or validade >= current_date
group by cliente_id;


-- ============================================================================
-- 5. GARANTIAS
-- ============================================================================
create table garantias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  aparelho_id uuid references aparelhos(id),
  venda_id uuid references vendas(id),
  os_id uuid references ordens_servico(id),
  tipo tipo_garantia not null,
  inicio date not null,
  fim date not null,
  observacao text,
  constraint chk_garantia_origem check (
    venda_id is not null or os_id is not null
  )
);

create index idx_garantias_cliente on garantias(cliente_id);
create index idx_garantias_aparelho on garantias(aparelho_id);


-- ============================================================================
-- 6. AUDITORIA — estender os triggers de log para as tabelas novas
-- ============================================================================
create trigger trg_log_ordens_servico
  after insert or update or delete on ordens_servico
  for each row execute function fn_registrar_log();

create trigger trg_log_financeiro
  after insert or update or delete on financeiro
  for each row execute function fn_registrar_log();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
alter table ordens_servico enable row level security;
alter table pecas_os enable row level security;
alter table financeiro enable row level security;
alter table cashback enable row level security;
alter table garantias enable row level security;

create policy "os_staff_all" on ordens_servico for all
  using (current_user_cargo() in ('admin', 'tecnico'));
create policy "pecas_os_staff_all" on pecas_os for all
  using (current_user_cargo() in ('admin', 'tecnico'));

-- Financeiro: apenas admin (vendedor/técnico não têm acesso — regra da Parte 5)
create policy "financeiro_admin_only" on financeiro for all
  using (current_user_cargo() = 'admin');

create policy "cashback_admin_all" on cashback for all using (current_user_cargo() = 'admin');
create policy "cashback_vendedor_select" on cashback for select
  using (current_user_cargo() = 'vendedor');

create policy "garantias_staff_all" on garantias for all
  using (current_user_cargo() in ('admin', 'vendedor', 'tecnico'));

grant select on vw_cliente_cashback_saldo to authenticated;

-- ============================================================================
-- 8. NOVOS MÓDULOS NO MENU DE PERMISSÕES (RBAC já existente desde a Fase 1)
-- ============================================================================
insert into modulos (chave, nome) values
  ('assistencia', 'Assistência Técnica'),
  ('financeiro', 'Financeiro'),
  ('cashback', 'Cashback')
on conflict (chave) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'admin', id, true, true, true, true from modulos
where chave in ('assistencia', 'financeiro', 'cashback')
on conflict (cargo, modulo_id) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'tecnico', id, true, true, true, false from modulos
where chave = 'assistencia'
on conflict (cargo, modulo_id) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'vendedor', id, true, false, false, false from modulos
where chave = 'cashback'
on conflict (cargo, modulo_id) do nothing;

-- ============================================================================
-- 9. FUNÇÃO DE APOIO PARA VENDAS: obter custo sem expor a tabela base
-- ============================================================================
-- O vendedor não tem SELECT na tabela base `produtos`/`aparelhos` (só na
-- view mascarada, sem custo). Mas o servidor precisa do custo real para
-- calcular o lucro ao registrar uma venda. Esta função roda com privilégio
-- elevado (SECURITY DEFINER) e é chamada apenas no servidor — o resultado
-- nunca é devolvido ao navegador do vendedor, só usado para gravar o
-- lucro no banco.
create or replace function obter_custo_produto(
  p_produto_id uuid default null,
  p_aparelho_id uuid default null
)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select custo from produtos where id = p_produto_id),
    (select custo from aparelhos where id = p_aparelho_id)
  );
$$;

grant execute on function obter_custo_produto(uuid, uuid) to authenticated;

-- Permite ao vendedor marcar o checklist de entrega da própria venda sem
-- abrir UPDATE geral na tabela `vendas` (que também tem valor_total/lucro).
create or replace function atualizar_checklist_venda(
  p_venda_id uuid,
  p_aparelho_conferido boolean,
  p_acessorios_recebidos boolean,
  p_garantia_entregue boolean,
  p_cliente_confirmou boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update vendas
  set
    checklist_aparelho_conferido = p_aparelho_conferido,
    checklist_acessorios_recebidos = p_acessorios_recebidos,
    checklist_garantia_entregue = p_garantia_entregue,
    checklist_cliente_confirmou = p_cliente_confirmou
  where id = p_venda_id
    and (usuario_id = auth.uid() or current_user_cargo() = 'admin');
end;
$$;

grant execute on function atualizar_checklist_venda(uuid, boolean, boolean, boolean, boolean) to authenticated;

-- Lançamentos financeiros automáticos (venda aprovada, OS entregue) precisam
-- ser gravados mesmo quando quem aciona a ação é vendedor ou técnico — o
-- RLS de `financeiro` é admin-only para consulta/edição manual, mas o
-- sistema ainda precisa poder registrar o evento de origem automaticamente.
create or replace function registrar_lancamento_financeiro(
  p_tipo tipo_financeiro,
  p_categoria text,
  p_valor numeric,
  p_origem_tipo origem_financeiro,
  p_origem_id uuid,
  p_usuario_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into financeiro (tipo, categoria, valor, origem_tipo, origem_id, usuario_id)
  values (p_tipo, p_categoria, p_valor, p_origem_tipo, p_origem_id, p_usuario_id)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function registrar_lancamento_financeiro(tipo_financeiro, text, numeric, origem_financeiro, uuid, uuid) to authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 2
-- ============================================================================
