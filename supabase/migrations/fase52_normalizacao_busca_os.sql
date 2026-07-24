-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 52 (Supabase / PostgreSQL)
-- Substitui `consultar_os_publico` (Fase 8) por uma versão que
-- normaliza o número da OS antes de comparar — "154", "0154", "OS154",
-- "os154", "OS-154" devem todos achar a mesma Ordem de Serviço. O
-- cliente nunca deve precisar saber quantos zeros existem no número
-- interno (formato "OS000154").
-- ============================================================================

create or replace function consultar_os_publico(p_numero_os text, p_telefone text)
returns table (
  numero_os text,
  status status_os,
  prazo date,
  valor numeric,
  observacoes_publicas text
)
language sql
stable
security definer
set search_path = public
as $$
  select os.numero_os, os.status, os.prazo, os.valor, os.observacoes_publicas
  from ordens_servico os
  join clientes c on c.id = os.cliente_id
  where
    -- Extrai só os dígitos do que o cliente digitou e do número
    -- guardado (formato "OS000154") e compara sem zero à esquerda —
    -- assim "154", "0154", "OS154", "os154", "OS-154" batem igual.
    ltrim(regexp_replace(p_numero_os, '\D', '', 'g'), '0')
      = ltrim(regexp_replace(os.numero_os, '\D', '', 'g'), '0')
    and c.whatsapp = regexp_replace(p_telefone, '\D', '', 'g');
$$;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 52
-- ============================================================================
