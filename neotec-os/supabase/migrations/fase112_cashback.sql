-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 112 (Supabase / PostgreSQL)
-- Cashback já existia (Fase 2) e já funcionava no PDV manual — essa
-- migração fecha 3 lacunas reais que faltavam:
--
-- 1. Checkout ONLINE nunca creditava cashback (só o PDV manual fazia).
-- 2. Não existia percentual configurável em lugar nenhum — sempre
--    preenchido manual pela equipe no PDV.
-- 3. Cupom não tinha opção de tipo "cashback" (só percentual/valor fixo).
-- ============================================================================

alter table configuracoes_precificacao add column if not exists cashback_percentual_padrao numeric(5,2) not null default 1.5;
alter table produtos add column if not exists cashback_percentual numeric(5,2);
alter table aparelhos add column if not exists cashback_percentual numeric(5,2);

comment on column produtos.cashback_percentual is 'Override do percentual padrão de cashback — null usa configuracoes_precificacao.cashback_percentual_padrao.';
comment on column aparelhos.cashback_percentual is 'Override do percentual padrão — null usa o valor global.';

alter type tipo_desconto_cupom add value if not exists 'cashback';

create or replace function obter_percentual_cashback_publico(p_produto_id uuid default null, p_aparelho_id uuid default null)
returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare
  v_percentual numeric;
begin
  if p_aparelho_id is not null then
    select cashback_percentual into v_percentual from aparelhos where id = p_aparelho_id;
    if v_percentual is not null then return v_percentual; end if;
  end if;

  if p_produto_id is not null then
    select cashback_percentual into v_percentual from produtos where id = p_produto_id;
    if v_percentual is not null then return v_percentual; end if;
  end if;

  select cashback_percentual_padrao into v_percentual from configuracoes_precificacao limit 1;
  return coalesce(v_percentual, 1.5);
end;
$$;

grant execute on function obter_percentual_cashback_publico(uuid, uuid) to anon, authenticated;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 112
-- ============================================================================
