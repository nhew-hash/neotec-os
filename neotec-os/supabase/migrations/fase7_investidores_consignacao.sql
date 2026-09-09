-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 7 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: Investidores e Consignação.
--
-- DECISÃO DE MODELAGEM (documentada também em ARCHITECTURE.md):
-- Nenhum saldo de investidor é armazenado como campo solto — mesmo
-- princípio já usado para cashback desde a Fase 1. Capital aportado/
-- sacado vem de `investidor_movimentos` (histórico imutável); capital
-- aplicado e lucro são CALCULADOS a partir de `aparelhos` e `venda_itens`
-- via view. Isso evita a mesma classe de bug que já corrigimos antes:
-- um saldo cacheado divergindo da soma real dos eventos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INVESTIDORES
-- ----------------------------------------------------------------------------
create type tipo_movimento_investidor as enum ('aporte', 'saque');

create table investidores (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  nome text not null,
  telefone text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_investidores_updated_at
  before update on investidores
  for each row execute function set_updated_at();

create table investidor_movimentos (
  id uuid primary key default gen_random_uuid(),
  investidor_id uuid not null references investidores(id) on delete cascade,
  tipo tipo_movimento_investidor not null,
  valor numeric(12,2) not null check (valor > 0),
  observacao text,
  usuario_id uuid references usuarios(id),
  data timestamptz not null default now()
);

create index idx_investidor_movimentos ON investidor_movimentos(investidor_id, data);

-- Agora que a tabela existe, liga o FK que ficou pendente da Fase 6
alter table aparelhos
  add constraint fk_aparelhos_investidor foreign key (investidor_id) references investidores(id);

-- View de resumo: capital investido, aplicado, livre, lucro, rentabilidade.
-- "Capital aplicado" = custo dos aparelhos do investidor que ainda NÃO
-- foram vendidos (dinheiro parado em estoque). "Lucro" = soma de
-- (valor - custo) dos itens já vendidos que pertenciam a esse investidor.
create view vw_investidor_resumo as
select
  i.id as investidor_id,
  i.nome,
  coalesce(aportes.total, 0) as capital_investido,
  coalesce(saques.total, 0) as total_sacado,
  coalesce(aplicado.total, 0) as capital_aplicado,
  coalesce(lucro.total, 0) as lucro,
  coalesce(aportes.total, 0) - coalesce(saques.total, 0) - coalesce(aplicado.total, 0) as capital_livre,
  case
    when coalesce(aportes.total, 0) = 0 then 0
    else round((coalesce(lucro.total, 0) / coalesce(aportes.total, 0)) * 100, 2)
  end as rentabilidade_pct
from investidores i
left join (
  select investidor_id, sum(valor) as total from investidor_movimentos where tipo = 'aporte' group by investidor_id
) aportes on aportes.investidor_id = i.id
left join (
  select investidor_id, sum(valor) as total from investidor_movimentos where tipo = 'saque' group by investidor_id
) saques on saques.investidor_id = i.id
left join (
  select investidor_id, sum(custo) as total from aparelhos
  where investidor_id is not null and status <> 'vendido'
  group by investidor_id
) aplicado on aplicado.investidor_id = i.id
left join (
  select a.investidor_id, sum(vi.valor - vi.custo) as total
  from aparelhos a
  join venda_itens vi on vi.aparelho_id = a.id
  where a.investidor_id is not null
  group by a.investidor_id
) lucro on lucro.investidor_id = i.id;

alter table investidores enable row level security;
alter table investidor_movimentos enable row level security;

create policy "investidores_admin_gerente_all" on investidores for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

create policy "investidor_movimentos_admin_gerente_all" on investidor_movimentos for all
  using (
    exists (select 1 from investidores i where i.id = investidor_movimentos.investidor_id and i.loja_id = current_user_loja_id())
    and current_user_cargo() in ('admin', 'gerente')
  );

grant select on vw_investidor_resumo to authenticated;

-- ----------------------------------------------------------------------------
-- 2. CONSIGNAÇÃO
-- Proprietário é modelado como `cliente_id` — reaproveita o cadastro de
-- clientes já existente (nome, telefone) em vez de duplicar uma tabela de
-- "pessoas" nova, coerente com o princípio de não duplicar conceito.
-- ----------------------------------------------------------------------------
create type status_consignacao as enum ('aguardando', 'vendido', 'devolvido');

create table consignacoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  cliente_id uuid not null references clientes(id),
  aparelho_id uuid references aparelhos(id),
  valor_combinado numeric(12,2) not null,
  prazo date,
  status status_consignacao not null default 'aguardando',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_consignacoes_updated_at
  before update on consignacoes
  for each row execute function set_updated_at();

alter table aparelhos
  add constraint fk_aparelhos_consignacao foreign key (consignacao_id) references consignacoes(id);

-- Lucro da consignação = valor de venda do aparelho - valor combinado com o
-- proprietário (o que sobra é da loja).
create view vw_consignacao_resumo as
select
  c.id as consignacao_id,
  c.valor_combinado,
  vi.valor as valor_venda,
  case when vi.valor is not null then vi.valor - c.valor_combinado else null end as lucro
from consignacoes c
left join venda_itens vi on vi.aparelho_id = c.aparelho_id;

alter table consignacoes enable row level security;
create policy "consignacoes_admin_gerente_all" on consignacoes for all
  using (current_user_cargo() in ('admin', 'gerente') and loja_id = current_user_loja_id());

grant select on vw_consignacao_resumo to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RBAC — novos módulos
-- ----------------------------------------------------------------------------
insert into modulos (chave, nome) values
  ('investidores', 'Investidores'),
  ('consignacao', 'Consignação')
on conflict (chave) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'admin'::cargo_usuario, id, true, true, true, true from modulos
where chave in ('investidores', 'consignacao')
on conflict (cargo, modulo_id) do nothing;

insert into permissoes (cargo, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
select 'gerente'::cargo_usuario, id, true, true, true, false from modulos
where chave in ('investidores', 'consignacao')
on conflict (cargo, modulo_id) do nothing;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 7
-- ============================================================================
