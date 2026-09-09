-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 14 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: permite venda sem cliente vinculado (PDV de balcão).
--
-- `vendas.cliente_id` era NOT NULL desde a Fase 1. Pro PDV rápido (venda
-- avulsa, sem cadastrar cliente), isso precisa virar opcional. O trigger
-- que gera evento de timeline (Fase 3) usa `new.cliente_id` — precisa ser
-- protegido pra não tentar gravar timeline de um cliente que não existe.
-- ============================================================================

alter table vendas alter column cliente_id drop not null;

-- Recria a função do trigger de timeline de vendas, agora pulando a
-- gravação quando não há cliente (nada a registrar na timeline de
-- "ninguém").
create or replace function trg_fn_timeline_venda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida' and new.cliente_id is not null then
    perform registrar_evento_timeline(
      new.cliente_id, 'venda', 'Venda realizada',
      'Valor: ' || new.valor_total::text,
      'vendas', new.id, new.usuario_id, new.loja_id
    );
  end if;
  return new;
end;
$$;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 14
-- ============================================================================
