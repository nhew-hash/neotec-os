-- ============================================================================
-- FASE 265 — PDV atômico + regra de desconto por cargo (Fase B da auditoria)
--
-- NÃO APLICADA EM NENHUM BANCO. ADITIVA (não altera nem apaga dado existente).
-- DEVE ser aplicada primeiro em ambiente de TESTE e validada com
-- supabase/tests/fase265_pdv_atomico.test.sql antes de produção.
--
-- ATENÇÃO — premissas inferidas do código (o schema base de `vendas`,
-- `venda_itens`, `aparelhos`, `movimentos_estoque` NÃO está nas migrations deste
-- repositório): colunas e valores de enum abaixo foram deduzidos de
-- src/services/vendas/pdv.service.ts. Se alguma coluna divergir do banco real, a
-- criação da função falha de forma visível no ambiente de teste.
--
-- Ativação em duas chaves independentes, ambas DESLIGADAS por padrão:
--   (1) env PDV_VENDA_ATOMICA=1 no app  -> passa a usar registrar_venda_pdv()
--   (2) configuracoes_desconto.regra_ativa = true -> passa a exigir aprovação
-- Os percentuais máximos por cargo NÃO são semeados: o dono precisa defini-los.
-- ============================================================================

-- 1) Configuração e regras de desconto -------------------------------------

create table if not exists configuracoes_desconto (
  loja_id        uuid primary key default default_loja_id() references lojas(id),
  regra_ativa    boolean not null default false,
  atualizado_por uuid references auth.users(id),
  updated_at     timestamptz not null default now()
);

create table if not exists regras_desconto (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null default default_loja_id() references lojas(id),
  cargo          text not null,
  percentual_max numeric(5,2) not null check (percentual_max >= 0 and percentual_max <= 100),
  atualizado_por uuid references auth.users(id),
  updated_at     timestamptz not null default now(),
  unique (loja_id, cargo)
);

create table if not exists aprovacoes_desconto (
  id               uuid primary key default gen_random_uuid(),
  loja_id          uuid not null default default_loja_id() references lojas(id),
  solicitante_id   uuid not null references auth.users(id),
  aprovador_id     uuid references auth.users(id),
  status           text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada', 'usada', 'expirada')),
  valor_bruto      numeric(12,2) not null,
  valor_desconto   numeric(12,2) not null check (valor_desconto >= 0),
  percentual       numeric(6,2) not null,
  motivo           text,
  decisao_motivo   text,
  payload          jsonb not null,
  venda_id         uuid references vendas(id) on delete set null,
  criado_em        timestamptz not null default now(),
  decidido_em      timestamptz,
  expira_em        timestamptz not null default (now() + interval '1 day')
);
create index if not exists idx_aprovacoes_desconto_status on aprovacoes_desconto (loja_id, status, criado_em desc);
create index if not exists idx_aprovacoes_desconto_solicitante on aprovacoes_desconto (solicitante_id, status);

create table if not exists auditoria_operacoes (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null default default_loja_id() references lojas(id),
  usuario_id  uuid references auth.users(id),
  entidade    text not null,
  entidade_id uuid,
  acao        text not null,
  dados       jsonb not null default '{}',
  criado_em   timestamptz not null default now()
);
create index if not exists idx_auditoria_operacoes_entidade on auditoria_operacoes (entidade, entidade_id);
create index if not exists idx_auditoria_operacoes_criado on auditoria_operacoes (loja_id, criado_em desc);

alter table configuracoes_desconto enable row level security;
alter table regras_desconto enable row level security;
alter table aprovacoes_desconto enable row level security;
alter table auditoria_operacoes enable row level security;

drop policy if exists "configuracoes_desconto_leitura" on configuracoes_desconto;
create policy "configuracoes_desconto_leitura" on configuracoes_desconto for select
  using (loja_id = current_user_loja_id());
drop policy if exists "configuracoes_desconto_admin" on configuracoes_desconto;
create policy "configuracoes_desconto_admin" on configuracoes_desconto for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id())
  with check (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

drop policy if exists "regras_desconto_leitura" on regras_desconto;
create policy "regras_desconto_leitura" on regras_desconto for select
  using (loja_id = current_user_loja_id());
drop policy if exists "regras_desconto_admin" on regras_desconto;
create policy "regras_desconto_admin" on regras_desconto for all
  using (current_user_cargo() = 'admin' and loja_id = current_user_loja_id())
  with check (current_user_cargo() = 'admin' and loja_id = current_user_loja_id());

-- Vendedor vê e cria só as próprias solicitações; gerente/admin veem e decidem todas da loja.
drop policy if exists "aprovacoes_desconto_select" on aprovacoes_desconto;
create policy "aprovacoes_desconto_select" on aprovacoes_desconto for select
  using (loja_id = current_user_loja_id() and (solicitante_id = auth.uid() or current_user_cargo() in ('admin', 'gerente')));
drop policy if exists "aprovacoes_desconto_insert" on aprovacoes_desconto;
create policy "aprovacoes_desconto_insert" on aprovacoes_desconto for insert
  with check (loja_id = current_user_loja_id() and solicitante_id = auth.uid() and status = 'pendente');
drop policy if exists "aprovacoes_desconto_decisao" on aprovacoes_desconto;
create policy "aprovacoes_desconto_decisao" on aprovacoes_desconto for update
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'))
  with check (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "auditoria_operacoes_leitura" on auditoria_operacoes;
create policy "auditoria_operacoes_leitura" on auditoria_operacoes for select
  using (loja_id = current_user_loja_id() and current_user_cargo() in ('admin', 'gerente'));
-- Sem policy de INSERT/UPDATE/DELETE: só funções SECURITY DEFINER gravam; ninguém edita a trilha.

-- Quem alterou regra/configuração de desconto fica registrado.
create or replace function trg_auditar_regra_desconto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria_operacoes (loja_id, usuario_id, entidade, entidade_id, acao, dados)
  values (coalesce(new.loja_id, old.loja_id), auth.uid(), tg_table_name, null, lower(tg_op),
          jsonb_build_object('antes', to_jsonb(old), 'depois', to_jsonb(new)));
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_regras_desconto_auditoria on regras_desconto;
create trigger trg_regras_desconto_auditoria after insert or update or delete on regras_desconto
  for each row execute function trg_auditar_regra_desconto();
drop trigger if exists trg_configuracoes_desconto_auditoria on configuracoes_desconto;
create trigger trg_configuracoes_desconto_auditoria after insert or update on configuracoes_desconto
  for each row execute function trg_auditar_regra_desconto();

-- 2) Regra de desconto (função pura de leitura) ------------------------------
-- Retorna: NULL = sem limite (regra desligada ou cargo admin); número = % máximo permitido sem aprovação.
create or replace function percentual_desconto_permitido() returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  v_cargo text := current_user_cargo()::text;
  v_loja uuid := current_user_loja_id();
  v_ativa boolean;
  v_max numeric;
begin
  select regra_ativa into v_ativa from configuracoes_desconto where loja_id = v_loja;
  if coalesce(v_ativa, false) = false then return null; end if;
  if v_cargo = 'admin' then return null; end if;
  select percentual_max into v_max from regras_desconto where loja_id = v_loja and cargo = v_cargo;
  return coalesce(v_max, 0); -- cargo sem regra definida: qualquer desconto exige aprovação
end;
$$;
grant execute on function percentual_desconto_permitido() to authenticated;

-- 3) Registro de venda do PDV em UMA transação ---------------------------------
-- p: { cliente_id?, forma_pagamento, pagamentos?[{metodo,valor}], desconto, garantia_dias?,
--      indicador_id?, cashback_utilizado, cashback_concedido, trade_in_avaliacao_id?,
--      aprovacao_desconto_id?, itens:[{tipo,id,quantidade,valor,ehBrinde}] }
-- Qualquer RAISE EXCEPTION desfaz TUDO (venda, itens, estoque, financeiro, cashback, garantia, trade-in).
-- SECURITY INVOKER: a RLS do usuário continua valendo em cada tabela.
create or replace function registrar_venda_pdv(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cliente uuid := nullif(p->>'cliente_id', '')::uuid;
  v_forma text := p->>'forma_pagamento';
  v_desconto numeric := coalesce((p->>'desconto')::numeric, 0);
  v_cb_uso numeric := coalesce((p->>'cashback_utilizado')::numeric, 0);
  v_cb_conc numeric := coalesce((p->>'cashback_concedido')::numeric, 0);
  v_garantia int := nullif(p->>'garantia_dias', '')::int;
  v_trade uuid := nullif(p->>'trade_in_avaliacao_id', '')::uuid;
  v_aprov uuid := nullif(p->>'aprovacao_desconto_id', '')::uuid;
  v_item jsonb;
  v_tipo text; v_id uuid; v_qtd int; v_valor numeric; v_custo numeric;
  v_bruto numeric := 0; v_custo_total numeric := 0; v_total numeric; v_lucro numeric;
  v_trade_valor numeric := 0; v_trade_rec record;
  v_saldo numeric; v_venda uuid; v_pct numeric; v_limite numeric;
  v_soma_pag numeric; v_primeiro_aparelho uuid; v_linhas int; v_ap record;
begin
  if v_user is null then raise exception 'SESSAO_EXPIRADA: faça login novamente'; end if;
  if jsonb_typeof(p->'itens') <> 'array' or jsonb_array_length(p->'itens') = 0 then
    raise exception 'VENDA_SEM_ITENS: adicione pelo menos um item';
  end if;
  if v_desconto < 0 or v_cb_uso < 0 or v_cb_conc < 0 then raise exception 'VALOR_INVALIDO: valores negativos não são permitidos'; end if;

  -- Bruto + custo (itens em ordem estável de id para evitar deadlock entre vendas concorrentes)
  for v_item in select i from jsonb_array_elements(p->'itens') i order by i->>'id' loop
    v_tipo := v_item->>'tipo'; v_id := (v_item->>'id')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::int, 1); v_valor := (v_item->>'valor')::numeric;
    if v_qtd <= 0 or v_valor < 0 then raise exception 'VALOR_INVALIDO: item com quantidade ou valor inválido'; end if;
    if v_tipo = 'aparelho' and v_qtd <> 1 then raise exception 'VALOR_INVALIDO: aparelho é vendido em unidade única'; end if;
    v_bruto := v_bruto + v_valor * v_qtd;
  end loop;

  if v_desconto > v_bruto then raise exception 'DESCONTO_INVALIDO: o desconto não pode ser maior que o valor dos itens'; end if;

  -- Regra de desconto por cargo (só atua com configuracoes_desconto.regra_ativa = true)
  v_limite := percentual_desconto_permitido();
  v_pct := case when v_bruto > 0 then round(v_desconto / v_bruto * 100, 2) else 0 end;
  if v_limite is not null and v_desconto > 0 and v_pct > v_limite then
    if v_aprov is null then
      raise exception 'DESCONTO_REQUER_APROVACAO: desconto de % %% excede o limite de % %% do seu cargo', v_pct, v_limite;
    end if;
    select * into v_ap from aprovacoes_desconto where id = v_aprov for update;
    if not found or v_ap.status <> 'aprovada' or v_ap.solicitante_id <> v_user or v_ap.expira_em < now()
       or v_desconto > v_ap.valor_desconto then
      raise exception 'APROVACAO_INVALIDA: aprovação inexistente, vencida, já usada ou menor que o desconto pedido';
    end if;
  end if;

  -- Trade-in: só 'aprovado', do mesmo cliente, travado contra uso simultâneo
  if v_trade is not null then
    select * into v_trade_rec from avaliacoes_trade_in where id = v_trade for update;
    if not found then raise exception 'TRADE_IN_INEXISTENTE: avaliação de trade-in não encontrada'; end if;
    if v_trade_rec.status <> 'aprovado' then raise exception 'TRADE_IN_NAO_APROVADO: só avaliação aprovada pela equipe pode abater a venda'; end if;
    if v_cliente is not null and v_trade_rec.cliente_id is not null and v_trade_rec.cliente_id <> v_cliente then
      raise exception 'TRADE_IN_OUTRO_CLIENTE: essa avaliação pertence a outro cliente';
    end if;
    v_trade_valor := coalesce(v_trade_rec.valor_aprovado, v_trade_rec.valor_calculado);
  end if;

  -- Cashback: saldo real do cliente, com lock por cliente (duas vendas simultâneas não gastam o mesmo saldo)
  if v_cb_uso > 0 then
    if v_cliente is null then raise exception 'CASHBACK_SEM_CLIENTE: cashback só pode ser usado com cliente'; end if;
    perform pg_advisory_xact_lock(hashtext('cashback:' || v_cliente::text));
    select coalesce(sum(case when tipo = 'credito' then valor else -valor end), 0) into v_saldo from cashback where cliente_id = v_cliente;
    if v_cb_uso > v_saldo then raise exception 'CASHBACK_INSUFICIENTE: cliente tem % de cashback', v_saldo; end if;
  end if;

  -- Disponibilidade + custo, item a item, com trava
  for v_item in select i from jsonb_array_elements(p->'itens') i order by i->>'id' loop
    v_tipo := v_item->>'tipo'; v_id := (v_item->>'id')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::int, 1);
    if v_tipo = 'aparelho' then
      -- Reserva atômica: só um comprador consegue mudar 'disponivel' -> 'vendido'
      update aparelhos set status = 'vendido' where id = v_id and status = 'disponivel';
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then raise exception 'APARELHO_INDISPONIVEL: aparelho já vendido ou indisponível (%)', v_id; end if;
      v_primeiro_aparelho := coalesce(v_primeiro_aparelho, v_id);
      v_custo := coalesce(obter_custo_produto(null, v_id), 0);
    else
      perform pg_advisory_xact_lock(hashtext('produto:' || v_id::text));
      select coalesce(saldo, 0) into v_saldo from vw_produtos_saldo where produto_id = v_id;
      if coalesce(v_saldo, 0) < v_qtd then raise exception 'SALDO_INSUFICIENTE: produto % tem saldo % e foram pedidas %', v_id, coalesce(v_saldo, 0), v_qtd; end if;
      v_custo := coalesce(obter_custo_produto(v_id, null), 0);
    end if;
    v_custo_total := v_custo_total + v_custo * v_qtd;
  end loop;

  v_total := greatest(0, v_bruto - v_desconto - v_cb_uso - v_trade_valor);
  v_lucro := v_total - v_custo_total;

  if v_forma = 'misto' then
    select coalesce(sum((x->>'valor')::numeric), 0) into v_soma_pag from jsonb_array_elements(coalesce(p->'pagamentos', '[]'::jsonb)) x;
    if abs(v_soma_pag - v_total) > 0.01 then
      raise exception 'PAGAMENTO_DIVERGENTE: soma dos pagamentos (%) não bate com o total (%)', v_soma_pag, v_total;
    end if;
  end if;

  -- jsonb_populate_record resolve sozinho os casts de enum (forma_pagamento etc.).
  insert into vendas (cliente_id, usuario_id, valor_total, desconto, lucro, canal, forma_pagamento, status,
                      indicador_id, cashback_utilizado, cashback_concedido, trade_in_avaliacao_id, trade_in_valor)
  select r.cliente_id, r.usuario_id, r.valor_total, r.desconto, r.lucro, r.canal, r.forma_pagamento, r.status,
         r.indicador_id, r.cashback_utilizado, r.cashback_concedido, r.trade_in_avaliacao_id, r.trade_in_valor
  from jsonb_populate_record(null::vendas, jsonb_build_object(
         'cliente_id', v_cliente, 'usuario_id', v_user, 'valor_total', v_total, 'desconto', v_desconto, 'lucro', v_lucro,
         'canal', 'loja_fisica', 'forma_pagamento', v_forma, 'status', 'concluida',
         'indicador_id', nullif(p->>'indicador_id', ''), 'cashback_utilizado', v_cb_uso, 'cashback_concedido', v_cb_conc,
         'trade_in_avaliacao_id', v_trade, 'trade_in_valor', v_trade_valor)) r
  returning id into v_venda;

  if v_trade is not null then
    update avaliacoes_trade_in set status = 'convertido_venda', venda_id = v_venda where id = v_trade;
  end if;

  if v_forma = 'misto' then
    insert into venda_pagamentos (venda_id, metodo, valor)
    select v_venda, r.metodo, r.valor
    from jsonb_array_elements(p->'pagamentos') x,
         lateral jsonb_populate_record(null::venda_pagamentos, jsonb_build_object('metodo', x->>'metodo', 'valor', (x->>'valor')::numeric)) r;
  end if;

  if v_cliente is not null then
    if v_cb_uso > 0 then insert into cashback (cliente_id, tipo, valor, origem) values (v_cliente, 'debito', v_cb_uso, 'Usado na venda #' || left(v_venda::text, 8)); end if;
    if v_cb_conc > 0 then insert into cashback (cliente_id, tipo, valor, origem) values (v_cliente, 'credito', v_cb_conc, 'Concedido na venda #' || left(v_venda::text, 8)); end if;
  end if;

  for v_item in select i from jsonb_array_elements(p->'itens') i loop
    v_tipo := v_item->>'tipo'; v_id := (v_item->>'id')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::int, 1); v_valor := (v_item->>'valor')::numeric;
    v_custo := coalesce(case when v_tipo = 'aparelho' then obter_custo_produto(null, v_id) else obter_custo_produto(v_id, null) end, 0);
    insert into venda_itens (venda_id, produto_id, aparelho_id, quantidade, valor, custo, eh_brinde)
    values (v_venda, case when v_tipo = 'produto' then v_id end, case when v_tipo = 'aparelho' then v_id end,
            v_qtd, v_valor, v_custo, coalesce((v_item->>'ehBrinde')::boolean, false));
    if v_tipo = 'aparelho' then
      insert into movimentos_estoque (aparelho_id, tipo, motivo, usuario_id) values (v_id, 'saida', 'Venda #' || left(v_venda::text, 8), v_user);
    else
      insert into movimentos_estoque (produto_id, tipo, quantidade, motivo, usuario_id) values (v_id, 'saida', v_qtd, 'Venda #' || left(v_venda::text, 8), v_user);
    end if;
  end loop;

  perform registrar_lancamento_financeiro('entrada', 'Venda', v_total, 'venda', v_venda, v_user);

  if v_garantia is not null and v_garantia > 0 and v_cliente is not null then
    insert into garantias (cliente_id, aparelho_id, venda_id, tipo, inicio, fim)
    values (v_cliente, v_primeiro_aparelho, v_venda, 'produto',
            (now() at time zone 'America/Sao_Paulo')::date,
            (now() at time zone 'America/Sao_Paulo')::date + v_garantia);
  end if;

  if v_aprov is not null and v_ap.id is not null then
    update aprovacoes_desconto set status = 'usada', venda_id = v_venda where id = v_aprov;
  end if;

  if v_desconto > 0 then
    perform registrar_auditoria('vendas', v_venda, 'desconto_aplicado',
            jsonb_build_object('desconto', v_desconto, 'percentual', v_pct, 'valor_bruto', v_bruto,
                               'limite_cargo', v_limite, 'aprovacao_id', v_aprov, 'lucro', v_lucro));
  end if;

  return v_venda;
end;
$$;
grant execute on function registrar_venda_pdv(jsonb) to authenticated;

-- A tabela auditoria_operacoes não tem policy de INSERT para usuários; a função acima é
-- SECURITY INVOKER, então a gravação da trilha precisa de uma função própria DEFINER:
create or replace function registrar_auditoria(p_entidade text, p_entidade_id uuid, p_acao text, p_dados jsonb) returns void
language sql security definer set search_path = public as $$
  insert into auditoria_operacoes (loja_id, usuario_id, entidade, entidade_id, acao, dados)
  values (current_user_loja_id(), auth.uid(), p_entidade, p_entidade_id, p_acao, coalesce(p_dados, '{}'::jsonb));
$$;
grant execute on function registrar_auditoria(text, uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

-- ROLLBACK:
--   drop function if exists registrar_venda_pdv(jsonb);
--   drop function if exists registrar_auditoria(text, uuid, text, jsonb);
--   drop function if exists percentual_desconto_permitido();
--   drop table if exists auditoria_operacoes, aprovacoes_desconto, regras_desconto, configuracoes_desconto cascade;
