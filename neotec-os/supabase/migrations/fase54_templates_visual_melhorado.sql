-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 54 (Supabase / PostgreSQL)
-- Substitui o conteúdo dos 5 templates padrão por versões com mais
-- cuidado visual (hierarquia, espaçamento, cor da marca) — mesmos
-- placeholders de antes, então nenhum código de renderização muda.
-- UPDATE do conteúdo inteiro (não substituição parcial de texto) —
-- mais seguro, não depende de casar string exata do que já existia.
-- ============================================================================

update documento_templates set conteudo_html = $HTML$
<div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1a1d29; max-width: 720px; margin: 0 auto; padding: 8px;">

  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 28px;">
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="width:44px; height:44px; border-radius:10px; background:#2643D6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:20px;">N</div>
      <div>
        <div style="font-size: 17px; font-weight: 700; color: #1a1d29; letter-spacing:-0.01em;">{{loja_nome}}</div>
        <div style="font-size: 11px; color: #8a8f9c;">Assistência técnica especializada</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="display:inline-block; background:#EEF1FB; color:#2643D6; font-weight:700; font-size:13px; padding:4px 12px; border-radius:20px;">OS {{numero_documento}}</div>
      <div style="font-size: 11px; color: #8a8f9c; margin-top:6px;">{{data_emissao}}</div>
    </div>
  </div>

  <div style="height:1px; background:linear-gradient(to right, #2643D6, #E4E7EF 40%); margin-bottom:20px;"></div>

  <div style="display:flex; gap: 20px; margin-bottom: 20px;">
    <div style="flex:1; background:#FAFBFC; border-radius:12px; padding:14px 16px;">
      <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:6px;">Cliente</div>
      <div style="font-size: 14px; font-weight:600;">{{cliente_nome}}</div>
      <div style="font-size: 12px; color:#5b6072; margin-top:2px;">{{cliente_whatsapp}}</div>
    </div>
    <div style="flex:1; background:#FAFBFC; border-radius:12px; padding:14px 16px;">
      <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:6px;">Aparelho</div>
      <div style="font-size: 14px; font-weight:600;">{{aparelho_modelo}}</div>
      <div style="font-size: 11px; color:#5b6072; margin-top:2px;">IMEI {{aparelho_imei}} · Série {{aparelho_serie}}</div>
      <div style="font-size: 11px; color:#5b6072;">Senha: {{aparelho_senha}}</div>
    </div>
    {{{qr_code}}}
  </div>

  <div style="border-left:3px solid #2643D6; background:#FAFBFC; border-radius: 0 12px 12px 0; padding:14px 16px; margin-bottom:16px;">
    <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:4px;">Defeito relatado</div>
    <div style="font-size: 13.5px; line-height:1.5;">{{defeito}}</div>
  </div>

  <div style="margin-bottom:16px;">
    <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:4px;">Diagnóstico</div>
    <div style="font-size: 13.5px; line-height:1.5;">{{diagnostico}}</div>
  </div>

  <div style="margin-bottom:16px;">
    <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:8px;">Checklist de recebimento</div>
    <div style="background:#FAFBFC; border-radius:12px; padding:12px 16px; font-size: 12.5px; line-height:2;">{{{checklist}}}</div>
  </div>

  <div style="margin-bottom:16px;">
    <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:4px;">Observações</div>
    <div style="font-size: 12.5px; color:#5b6072;">{{observacoes}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:center; background:#EEF1FB; border-radius:12px; padding:12px 16px; font-size:12.5px; margin-bottom:32px;">
    <span><strong style="color:#2643D6;">Garantia:</strong> {{garantia}}</span>
    <span style="color:#5b6072;">Acessórios entregues: ________________</span>
  </div>

  <div style="display:flex; justify-content:space-between; gap: 40px; font-size: 11px;">
    <div style="flex:1; text-align:center;">{{{assinatura_cliente}}}<div style="border-top:1px solid #D5D9E3; padding-top:6px; color:#8a8f9c;">Assinatura do cliente</div></div>
    <div style="flex:1; text-align:center;">{{{assinatura_tecnico}}}<div style="border-top:1px solid #D5D9E3; padding-top:6px; color:#8a8f9c;">Assinatura do técnico</div></div>
  </div>

  <div style="text-align:center; font-size: 9px; color:#b3b7c2; margin-top:28px;">
    Documento gerado pelo Neotec OS em {{data_emissao}} — não substitui nota fiscal.
  </div>
</div>
$HTML$
where tipo_documento = 'os' and formato = 'a4';

update documento_templates set conteudo_html = $HTML$
<div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto; color:#1a1d29;">
  <div style="text-align:center; font-weight:700; font-size:14px; letter-spacing:0.02em;">{{loja_nome}}</div>
  <div style="text-align:center; color:#5b6072;">Assistência Técnica</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div style="text-align:center; font-weight:700; font-size:13px; margin-bottom:6px;">OS {{numero_documento}}</div>
  <div>Cliente: {{cliente_nome}}</div>
  <div>WhatsApp: {{cliente_whatsapp}}</div>
  <div>Data: {{data_emissao}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div style="font-weight:700; margin-bottom:2px;">DEFEITO</div>
  <div>{{defeito}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div>Garantia: {{garantia}}</div>
  <div style="border-top:1px dashed #999; margin:12px 0 4px;"></div>
  <div style="text-align:center; margin-top:20px;">Assinatura</div>
  <div style="text-align:center; border-top:1px solid #999; margin-top:24px; padding-top:4px; color:#5b6072;">_______________________</div>
</div>
$HTML$
where tipo_documento = 'os' and formato = 'cupom';

update documento_templates set conteudo_html = $HTML$
<div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1a1d29; max-width: 720px; margin: 0 auto; padding: 8px;">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="width:44px; height:44px; border-radius:10px; background:#2643D6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:20px;">N</div>
      <div style="font-size: 17px; font-weight: 700; color: #1a1d29;">{{loja_nome}}</div>
    </div>
    <div style="text-align:right;">
      <div style="display:inline-block; background:#EEF1FB; color:#2643D6; font-weight:700; font-size:13px; padding:4px 12px; border-radius:20px;">Orçamento {{numero_documento}}</div>
      <div style="font-size: 11px; color: #8a8f9c; margin-top:6px;">{{data_emissao}}</div>
    </div>
  </div>

  <div style="height:1px; background:linear-gradient(to right, #2643D6, #E4E7EF 40%); margin-bottom:20px;"></div>

  <div style="background:#FAFBFC; border-radius:12px; padding:14px 16px; margin-bottom:20px;">
    <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:4px;">Cliente</div>
    <div style="font-size: 14px; font-weight:600;">{{cliente_nome}}</div>
    <div style="font-size: 12px; color:#5b6072;">{{cliente_whatsapp}}</div>
  </div>

  <div style="margin-bottom:20px;">
    <div style="font-size: 10px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8f9c; font-weight:700; margin-bottom:8px;">Itens</div>
    <div style="font-size: 13.5px;">{{{itens}}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:20px; color:#5b6072;">
    <span><strong style="color:#1a1d29;">Garantia:</strong> {{garantia}}</span>
    <span><strong style="color:#1a1d29;">Validade da proposta:</strong> {{prazo}}</span>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:center; background:#2643D6; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
    <span style="color:#DCE3FA; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; font-weight:700;">Total</span>
    <span style="color:#fff; font-size: 22px; font-weight:700;">{{valor}}</span>
  </div>

  {{{qr_code}}}

  <div style="text-align:center; font-size: 9px; color:#b3b7c2; margin-top:28px;">
    Documento gerado pelo Neotec OS em {{data_emissao}} — não substitui nota fiscal.
  </div>
</div>
$HTML$
where tipo_documento = 'orcamento' and formato = 'a4';

update documento_templates set conteudo_html = $HTML$
<div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto; color:#1a1d29;">
  <div style="text-align:center; font-weight:700; font-size:14px;">{{loja_nome}}</div>
  <div style="text-align:center; color:#5b6072;">Cupom de Venda</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div style="text-align:center; font-weight:700;">Venda {{numero_documento}}</div>
  <div>Data: {{data_emissao}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div>{{{itens}}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px;"><span>TOTAL</span><span>{{valor}}</span></div>
  <div>Pagamento: {{forma_pagamento}}</div>
  <div>Garantia: {{garantia}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  {{{qr_code}}}
  <div style="text-align:center; margin-top:10px; font-weight:700;">Obrigado pela preferência!</div>
  <div style="text-align:center; color:#5b6072;">@neotecaraguari</div>
</div>
$HTML$
where tipo_documento = 'venda' and formato = 'cupom';

update documento_templates set conteudo_html = $HTML$
<div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto; color:#1a1d29;">
  <div style="text-align:center; font-weight:700; font-size:14px;">{{loja_nome}}</div>
  <div style="text-align:center; letter-spacing:0.08em; color:#5b6072;">RECIBO</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div>Cliente: {{cliente_nome}}</div>
  <div>Data: {{data_emissao}}</div>
  <div>Responsável: {{responsavel}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px;"><span>VALOR</span><span>{{valor}}</span></div>
  <div>Forma de pagamento: {{forma_pagamento}}</div>
  <div style="border-top:1px dashed #999; margin:8px 0;"></div>
  {{{qr_code}}}
</div>
$HTML$
where tipo_documento = 'recibo' and formato = 'cupom';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 54
-- ============================================================================
