-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 233 (Supabase / PostgreSQL)
-- Limpeza pontual: leads que JÁ ESTAVAM no pipeline antes da regra da
-- Fase 232 (empresa com site não é lead viável) e ainda têm `website`
-- preenchido são marcados como perdidos — não faz sentido continuar
-- prospectando quem já tem site. Não mexe em quem já fechou venda nem
-- em quem já estava marcado como perdido por outro motivo.
--
-- Idempotente por natureza: a condição de status ('novo', 'contato_
-- realizado', etc — tudo que não é 'perdido'/'venda_fechada') deixa de
-- casar depois de rodar uma vez, então rodar de novo não faz nada.
-- ============================================================================

do $$
declare
  v_lead record;
  v_total integer := 0;
begin
  for v_lead in
    select l.id, l.status
    from prostec_leads l
    join prostec_companies c on c.id = l.company_id
    where l.status not in ('perdido', 'venda_fechada')
      and coalesce(trim(c.website), '') <> ''
  loop
    update prostec_leads
    set status = 'perdido', motivo_perda = 'Já possui site', updated_at = now()
    where id = v_lead.id;

    insert into prostec_lead_status_history (lead_id, from_status, to_status, changed_by)
    values (v_lead.id, v_lead.status, 'perdido', null);

    insert into prostec_atividades (lead_id, usuario_id, tipo, descricao)
    values (v_lead.id, null, 'status_mudou', 'Marcado como perdido — Já possui site (limpeza automática, Fase 233)');

    v_total := v_total + 1;
  end loop;

  raise notice 'Fase 233: % lead(s) marcado(s) como perdido por já ter site', v_total;
end $$;
