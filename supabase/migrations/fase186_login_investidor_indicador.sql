-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 186 (Supabase / PostgreSQL)
-- Login próprio pra Investidor e Indicador (nunca tiveram antes — só
-- existiam como registro que a equipe gerenciava). Cargo novo pra
-- vendedor da Prostec (fusão do sistema de prospecção ainda por vir).
--
-- CUIDADO CRÍTICO: investidor e indicador logados só podem ver os
-- PRÓPRIOS dados — nunca dados de outro investidor/indicador, nunca
-- dados internos da loja (clientes, preços de custo, outras vendas).
-- Todas as policies abaixo são restritas por padrão.
-- ============================================================================

alter type cargo_usuario add value if not exists 'vendedor_prostec';
alter type cargo_usuario add value if not exists 'investidor';
alter type cargo_usuario add value if not exists 'indicador';

alter table usuarios add column if not exists investidor_id uuid references investidores(id) on delete set null;
alter table usuarios add column if not exists indicador_id uuid references indicadores(id) on delete set null;

comment on column usuarios.investidor_id is 'Preenchido só quando cargo = investidor — qual registro de investidor essa conta de login representa.';
comment on column usuarios.indicador_id is 'Preenchido só quando cargo = indicador — qual registro de indicador essa conta de login representa.';

create or replace function current_user_investidor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select investidor_id from usuarios where id = auth.uid();
$$;

create or replace function current_user_indicador_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select indicador_id from usuarios where id = auth.uid();
$$;

create policy "investidores_self_select" on investidores for select
  using (id = current_user_investidor_id());

create policy "investidor_movimentos_self_select" on investidor_movimentos for select
  using (investidor_id = current_user_investidor_id());

create policy "indicadores_self_select" on indicadores for select
  using (id = current_user_indicador_id());

create policy "indicador_movimentos_self_select" on indicador_movimentos for select
  using (indicador_id = current_user_indicador_id());

create policy "aparelhos_investidor_self_select" on aparelhos for select
  using (investidor_id = current_user_investidor_id());

create policy "vendas_indicador_self_select" on vendas for select
  using (indicador_id = current_user_indicador_id());

create policy "ordens_servico_indicador_self_select" on ordens_servico for select
  using (indicador_id = current_user_indicador_id());

create view vw_indicacoes_do_indicador as
select
  'venda' as tipo, v.id as origem_id, v.indicador_id, cl.nome as cliente_nome,
  v.valor_total as valor, v.status as status, v.data_venda as data
from vendas v
join clientes cl on cl.id = v.cliente_id
where v.indicador_id is not null
union all
select
  'os' as tipo, os.id as origem_id, os.indicador_id, cl.nome as cliente_nome,
  os.valor as valor, os.status::text as status, os.data_entrada as data
from ordens_servico os
join clientes cl on cl.id = os.cliente_id
where os.indicador_id is not null;

grant select on vw_indicacoes_do_indicador to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 186
-- ============================================================================
