-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 88 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: motor de precificação — tabela de taxas editável
-- (nunca fixa em código), configuração de modo de juros (repassar ao
-- cliente vs. embutir no preço), e o campo `preco_liquido_desejado`
-- nos três lugares onde produto tem preço (produtos, aparelhos,
-- variantes de lacrado). `preco_venda` continua existindo em todos —
-- quando `preco_liquido_desejado` está preenchido, o motor de
-- precificação CALCULA o `preco_venda` (vitrine) a partir dele; sem
-- isso preenchido, o item continua funcionando exatamente como antes
-- (preço direto, sem o motor envolvido) — nada quebra pro que já
-- existe cadastrado.
-- ============================================================================

create table configuracoes_precificacao (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null unique default default_loja_id() references lojas(id),
  modo_juros text not null default 'repassar_juros', -- 'repassar_juros' | 'embutir_juros'
  desconto_pix_percentual numeric(5,2) not null default 5,
  gateway_referencia text not null default 'mercadopago', -- só rótulo/contexto — troca de gateway no futuro não exige migration, só reeditar a tabela de taxas
  updated_at timestamptz not null default now()
);

insert into configuracoes_precificacao (loja_id) select id from lojas;

create trigger trg_configuracoes_precificacao_updated_at
  before update on configuracoes_precificacao
  for each row execute function set_updated_at();

-- parcela = 0 representa o Pix (tratado à parte de 1x-12x, taxa bem menor).
create table tabela_taxas_parcelamento (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null default default_loja_id() references lojas(id),
  parcela integer not null,
  taxa_percentual numeric(5,2) not null,
  ativo boolean not null default true,
  unique (loja_id, parcela)
);

-- Semente com a tabela de exemplo que veio no pedido — 100% editável depois, nunca fixa em código de verdade.
insert into tabela_taxas_parcelamento (loja_id, parcela, taxa_percentual)
select l.id, t.parcela, t.taxa
from lojas l
cross join (values
  (0, 0.60), (1, 2.99), (2, 2.99), (3, 3.25), (4, 3.87), (5, 4.46), (6, 5.04),
  (7, 5.08), (8, 5.70), (9, 6.32), (10, 6.77), (11, 7.39), (12, 8.02)
) as t(parcela, taxa);

alter table produtos add column if not exists preco_liquido_desejado numeric(12,2);
alter table aparelhos add column if not exists preco_liquido_desejado numeric(12,2);
alter table catalogo_lacrados_variantes add column if not exists preco_liquido_desejado numeric(12,2);

comment on column produtos.preco_liquido_desejado is
  'Quanto a loja quer receber líquido, depois de qualquer taxa de gateway. Quando preenchido, preco_venda (vitrine) é CALCULADO a partir disso pelo motor de precificação, não editado direto.';

alter table configuracoes_precificacao enable row level security;
alter table tabela_taxas_parcelamento enable row level security;

create policy "configuracoes_precificacao_admin_write" on configuracoes_precificacao for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());
create policy "tabela_taxas_parcelamento_admin_write" on tabela_taxas_parcelamento for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- Leitura pública — a loja precisa consultar a tabela de taxas e o
-- modo pra calcular o que mostra na página de produto, sem sessão.
create or replace function obter_config_precificacao_publico()
returns table (modo_juros text, desconto_pix_percentual numeric)
language sql stable security definer set search_path = public
as $$ select modo_juros, desconto_pix_percentual from configuracoes_precificacao limit 1; $$;
grant execute on function obter_config_precificacao_publico() to anon, authenticated;

create or replace function listar_taxas_parcelamento_publico()
returns setof tabela_taxas_parcelamento
language sql stable security definer set search_path = public
as $$ select * from tabela_taxas_parcelamento where ativo = true order by parcela; $$;
grant execute on function listar_taxas_parcelamento_publico() to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 88
-- ============================================================================
