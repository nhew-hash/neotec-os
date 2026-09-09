-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 34 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: corrige um bug real — `clientes.temperatura` era
-- referenciada em vários lugares do código (Fase 28 em diante:
-- pipeline-kanban.tsx, ia-atendimento-orquestrador, crm-pipeline.service)
-- mas a coluna NUNCA foi criada de verdade no banco. Isso vinha
-- silenciosamente falhando: a atualização de temperatura pela IA
-- (`clientes.update({ temperatura })`) e a query do Kanban
-- (`cliente:clientes(..., temperatura)`) sempre estavam quebradas contra
-- o banco real, mascarado até o TypeScript pegar a inconsistência de
-- tipo primeiro.
-- ============================================================================

alter table clientes
  add column if not exists temperatura text not null default 'frio'
    check (temperatura in ('quente', 'morno', 'frio'));

comment on column clientes.temperatura is
  'Classificação de interesse de compra, atualizada pela IA de Atendimento (Fase 28) a cada mensagem — quente/morno/frio.';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 34
-- ============================================================================
