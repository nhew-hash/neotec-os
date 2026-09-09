-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 159 (Supabase / PostgreSQL)
-- Adiciona no template A4 de OS uma caixa pra marcar com caneta que o
-- aparelho foi retirado — pedido explícito, fica perto das assinaturas.
-- ============================================================================

update documento_templates
set conteudo_html = replace(
  conteudo_html,
  '<div style="display:flex; justify-content:space-between; margin-top: 40px; font-size: 11px;">
    <div style="width:45%; text-align:center;">{{{assinatura_cliente}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do cliente</div></div>
    <div style="width:45%; text-align:center;">{{{assinatura_tecnico}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do técnico</div></div>
  </div>',
  '<div style="display:flex; align-items:center; gap:8px; margin-top:20px; font-size:12px;">
    <div style="width:16px; height:16px; border:1.5px solid #333;"></div>
    <span><strong>Aparelho retirado</strong> — data: ______/______/________</span>
  </div>

  <div style="display:flex; justify-content:space-between; margin-top: 32px; font-size: 11px;">
    <div style="width:45%; text-align:center;">{{{assinatura_cliente}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do cliente</div></div>
    <div style="width:45%; text-align:center;">{{{assinatura_tecnico}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do técnico</div></div>
  </div>'
)
where tipo_documento = 'os' and formato = 'a4' and padrao = true;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 159
-- ============================================================================
