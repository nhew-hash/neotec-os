-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 178 (Supabase / PostgreSQL)
-- "Atendimento encerrado" também no CRM Venda — separado de "Venda
-- feita" (venda feita = fechou a venda; atendimento encerrado = o
-- relacionamento com esse lead específico terminou, não tem mais
-- nada pendente).
-- ============================================================================

do $$
begin
  if not exists (select 1 from crm_etapas where nome = 'Atendimento encerrado' and tipo = 'venda') then
    insert into crm_etapas (nome, ordem, cor, tipo) values ('Atendimento encerrado', 8, '#6B7280', 'venda');
  end if;
end $$;
