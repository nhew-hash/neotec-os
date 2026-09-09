-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 158 (Supabase / PostgreSQL)
-- Reescreve o template de comprovante de venda de aparelho, seguindo
-- o formato profissional detalhado pedido — cabeçalho fiscal, tabela
-- de itens (aparelho + acessórios), resumo financeiro, seção
-- específica do aparelho, garantia, assinaturas e QR.
--
-- Blocos condicionais (seção do aparelho, bateria, observações) são
-- montados como HTML pronto no código TypeScript e injetados via
-- placeholder de HTML cru ({{{...}}}) — o motor de template só faz
-- substituição simples, não tem "if" embutido no HTML.
-- ============================================================================

update documento_templates
set conteudo_html = $HTML$
<div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto; font-size: 12px;">
  <div style="text-align:center; border-bottom: 3px solid #2643D6; padding-bottom: 10px; margin-bottom: 14px;">
    <div style="font-size: 20px; font-weight: 700; color: #2643D6;">NEOTEC TECNOLOGIA E ACESSÓRIOS LTDA</div>
    <div style="font-size: 11px; color: #666; margin-top: 3px;">CNPJ: 37.091.751/0001-70</div>
    <div style="font-size: 11px; color: #666;">Araguari — MG</div>
    <div style="font-size: 11px; color: #666;">WhatsApp: (34) 98817-8338</div>
    <div style="font-size: 13px; font-weight: 700; margin-top: 8px;">COMPROVANTE DE VENDA Nº {{numero_documento}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; margin-bottom: 12px; font-size: 11px;">
    <div><strong>Data de emissão:</strong> {{data_emissao}}</div>
    <div><strong>Vendedor:</strong> {{vendedor}}</div>
    <div><strong>Pedido:</strong> #NEO-{{numero_documento}}</div>
  </div>

  <div style="margin-bottom: 12px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px;">Cliente</div>
    <div style="font-size: 12px; line-height:1.6;">
      <div><strong>Nome:</strong> {{cliente_nome}}</div>
      <div><strong>CPF:</strong> {{cliente_cpf}}</div>
      <div><strong>Telefone:</strong> {{cliente_whatsapp}}</div>
    </div>
  </div>

  <div style="margin-bottom: 12px;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px;">Itens da venda</div>
    <table style="width:100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="border-bottom: 1px solid #ccc; text-align:left;">
          <th style="padding: 4px 2px;">Descrição</th>
          <th style="padding: 4px 2px;">Identificação</th>
          <th style="padding: 4px 2px; text-align:center;">Qtd.</th>
          <th style="padding: 4px 2px; text-align:right;">V. Unit.</th>
          <th style="padding: 4px 2px; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{{linhas_itens}}}
      </tbody>
    </table>
  </div>

  <div style="margin-bottom: 12px; margin-left: auto; width: 220px; font-size: 12px;">
    <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>{{subtotal}}</span></div>
    <div style="display:flex; justify-content:space-between;"><span>Desconto:</span><span>-{{desconto}}</span></div>
    <div style="display:flex; justify-content:space-between; font-weight:700; font-size:14px; border-top: 1px solid #333; margin-top:4px; padding-top:4px;"><span>TOTAL:</span><span>{{total}}</span></div>
    <div style="display:flex; justify-content:space-between; margin-top:6px;"><span>Pagamento:</span><span>{{forma_pagamento}}</span></div>
    <div style="display:flex; justify-content:space-between;"><span>Status:</span><span style="font-weight:700; color:#2E7D32;">{{status}}</span></div>
  </div>

  {{{bloco_aparelho}}}

  <div style="margin-bottom: 14px; clear:both;">
    <div style="font-size: 11px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:3px;">Garantia e condições</div>
    <div style="font-size: 11px; line-height:1.6; color:#333;">{{garantia}}</div>
    {{{bloco_observacoes}}}
  </div>

  <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top: 32px;">
    <div style="text-align:center; width: 45%;">
      <div style="border-top: 1px solid #333; padding-top:5px; font-size: 10px;">Assinatura do Cliente</div>
    </div>
    <div style="text-align:center; width: 45%;">
      <div style="border-top: 1px solid #333; padding-top:5px; font-size: 10px;">Assinatura da Neotec</div>
    </div>
  </div>

  <div style="text-align:center; margin-top: 16px;">
    {{{qr_code}}}
  </div>

  <div style="text-align:center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #eee; font-size: 9px; color:#999; line-height:1.6;">
    <div>Instagram: @neotec_araguari &nbsp;•&nbsp; Site: neotecbrasil.com</div>
    <div style="margin-top:2px;">Este documento comprova a operação comercial realizada entre a Neotec e o cliente.</div>
  </div>
</div>
$HTML$
where tipo_documento = 'comprovante_aparelho' and formato = 'a4' and padrao = true;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 158
-- ============================================================================
