-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 51 (Supabase / PostgreSQL)
-- Correção defensiva — se a Fase 47 já tinha sido aplicada antes da
-- Fase 50 (assinatura digital) existir, o template de OS ainda tem a
-- linha de assinatura fixa (sem placeholder). Esse UPDATE troca pelo
-- texto novo, com os placeholders {{{assinatura_cliente}}} e
-- {{{assinatura_tecnico}}}. Não faz nada (0 linhas afetadas, sem erro)
-- se a Fase 47 ainda nem tinha sido aplicada — nesse caso ela já nasce
-- correta.
-- ============================================================================

update documento_templates
set conteudo_html = replace(
  conteudo_html,
  '<div style="display:flex; justify-content:space-between; margin-top: 40px; font-size: 11px;">
    <div style="width:45%; border-top:1px solid #999; padding-top:4px; text-align:center;">Assinatura do cliente</div>
    <div style="width:45%; border-top:1px solid #999; padding-top:4px; text-align:center;">Assinatura do técnico</div>
  </div>',
  '<div style="display:flex; justify-content:space-between; margin-top: 40px; font-size: 11px;">
    <div style="width:45%; text-align:center;">{{{assinatura_cliente}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do cliente</div></div>
    <div style="width:45%; text-align:center;">{{{assinatura_tecnico}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do técnico</div></div>
  </div>'
)
where tipo_documento = 'os' and formato = 'a4';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 51
-- ============================================================================
