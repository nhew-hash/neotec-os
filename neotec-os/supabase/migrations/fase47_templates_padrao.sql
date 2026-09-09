-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 47 (Supabase / PostgreSQL)
-- Aditivo. Conteúdo: templates padrão de todos os documentos — o
-- sistema já funciona sem precisar cadastrar nada manualmente antes.
-- Editável depois pela tela (Configurações → Impressão → Templates).
-- ============================================================================

insert into documento_templates (loja_id, tipo_documento, formato, nome, padrao, conteudo_html)
select id, 'os', 'a4', 'Padrão A4', true, $HTML$
<div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #2643D6; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <div style="font-size: 20px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>
      <div style="font-size: 12px; color: #666;">Assistência técnica especializada</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size: 16px; font-weight: 700;">OS {{numero_documento}}</div>
      <div style="font-size: 11px; color: #666;">{{data_emissao}}</div>
    </div>
  </div>

  <div style="display:flex; gap: 24px; margin-bottom: 16px;">
    <div style="flex:1;">
      <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:4px;">Cliente</div>
      <div style="font-size: 13px;"><strong>{{cliente_nome}}</strong></div>
      <div style="font-size: 12px; color:#444;">{{cliente_whatsapp}}</div>
    </div>
    <div style="flex:1;">
      <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:4px;">Aparelho</div>
      <div style="font-size: 13px;">{{aparelho_modelo}}</div>
      <div style="font-size: 11px; color:#444;">IMEI: {{aparelho_imei}} · Série: {{aparelho_serie}}</div>
      <div style="font-size: 11px; color:#444;">Senha: {{aparelho_senha}}</div>
    </div>
    {{{qr_code}}}
  </div>

  <div style="background:#f7f8fa; border-radius:6px; padding:12px; margin-bottom:12px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:4px;">Defeito relatado</div>
    <div style="font-size: 13px;">{{defeito}}</div>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:4px;">Diagnóstico</div>
    <div style="font-size: 13px;">{{diagnostico}}</div>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:6px;">Checklist de recebimento</div>
    <div style="font-size: 12px;">{{{checklist}}}</div>
  </div>

  <div style="margin-bottom:12px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:4px;">Observações</div>
    <div style="font-size: 12px;">{{observacoes}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:24px;">
    <span><strong>Garantia:</strong> {{garantia}}</span>
    <span><strong>Acessórios entregues:</strong> ____________________________</span>
  </div>

  <div style="display:flex; justify-content:space-between; margin-top: 40px; font-size: 11px;">
    <div style="width:45%; text-align:center;">{{{assinatura_cliente}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do cliente</div></div>
    <div style="width:45%; text-align:center;">{{{assinatura_tecnico}}}<div style="border-top:1px solid #999; padding-top:4px;">Assinatura do técnico</div></div>
  </div>

  <div style="text-align:center; font-size: 9px; color:#999; margin-top:24px;">
    Documento gerado pelo Neotec OS em {{data_emissao}} — não substitui nota fiscal.
  </div>
</div>
$HTML$
from lojas
on conflict (loja_id, tipo_documento, formato) where padrao = true do nothing;

insert into documento_templates (loja_id, tipo_documento, formato, nome, padrao, conteudo_html)
select id, 'os', 'cupom', 'Padrão Cupom', true, $HTML$
<div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto;">
  <div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center;">OS {{numero_documento}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div>Cliente: {{cliente_nome}}</div>
  <div>WhatsApp: {{cliente_whatsapp}}</div>
  <div>Data: {{data_emissao}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div><strong>Defeito:</strong> {{defeito}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div>Garantia: {{garantia}}</div>
  <div style="text-align:center; margin-top:16px;">Assinatura: ______________________</div>
</div>
$HTML$
from lojas
on conflict (loja_id, tipo_documento, formato) where padrao = true do nothing;

insert into documento_templates (loja_id, tipo_documento, formato, nome, padrao, conteudo_html)
select id, 'orcamento', 'a4', 'Padrão A4', true, $HTML$
<div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #2643D6; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 20px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>
    <div style="text-align:right;">
      <div style="font-size: 16px; font-weight: 700;">Orçamento {{numero_documento}}</div>
      <div style="font-size: 11px; color: #666;">{{data_emissao}}</div>
    </div>
  </div>

  <div style="margin-bottom:16px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600;">Cliente</div>
    <div style="font-size: 13px;"><strong>{{cliente_nome}}</strong> — {{cliente_whatsapp}}</div>
  </div>

  <div style="margin-bottom:16px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:6px;">Itens</div>
    <div style="font-size: 13px;">{{itens}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:16px;">
    <span><strong>Garantia:</strong> {{garantia}}</span>
    <span><strong>Validade:</strong> {{prazo}}</span>
  </div>

  <div style="text-align:right; font-size: 18px; font-weight:700; border-top:2px solid #2643D6; padding-top:8px; margin-bottom:16px;">
    Total: {{valor}}
  </div>

  {{{qr_code}}}

  <div style="text-align:center; font-size: 9px; color:#999; margin-top:24px;">
    Documento gerado pelo Neotec OS em {{data_emissao}} — não substitui nota fiscal.
  </div>
</div>
$HTML$
from lojas
on conflict (loja_id, tipo_documento, formato) where padrao = true do nothing;

insert into documento_templates (loja_id, tipo_documento, formato, nome, padrao, conteudo_html)
select id, 'venda', 'cupom', 'Padrão Cupom', true, $HTML$
<div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto;">
  <div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center;">Venda {{numero_documento}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div>Data: {{data_emissao}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div>{{itens}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div style="font-weight:700;">Total: {{valor}}</div>
  <div>Pagamento: {{forma_pagamento}}</div>
  <div>Garantia: {{garantia}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  {{{qr_code}}}
  <div style="text-align:center; margin-top:8px;">Obrigado pela preferência!</div>
  <div style="text-align:center;">@neotecaraguari</div>
</div>
$HTML$
from lojas
on conflict (loja_id, tipo_documento, formato) where padrao = true do nothing;

insert into documento_templates (loja_id, tipo_documento, formato, nome, padrao, conteudo_html)
select id, 'recibo', 'cupom', 'Padrão Cupom', true, $HTML$
<div style="font-family: 'Courier New', monospace; font-size: 11px; width: 280px; margin: 0 auto;">
  <div style="text-align:center; font-weight:700; font-size:13px;">{{loja_nome}}</div>
  <div style="text-align:center;">RECIBO</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div>Cliente: {{cliente_nome}}</div>
  <div>Data: {{data_emissao}}</div>
  <div>Responsável: {{responsavel}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  <div style="font-weight:700;">Valor: {{valor}}</div>
  <div>Forma de pagamento: {{forma_pagamento}}</div>
  <div style="border-top:1px dashed #000; margin:6px 0;"></div>
  {{{qr_code}}}
</div>
$HTML$
from lojas
on conflict (loja_id, tipo_documento, formato) where padrao = true do nothing;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 47
-- ============================================================================
