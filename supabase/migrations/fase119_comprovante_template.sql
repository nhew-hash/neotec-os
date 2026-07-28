-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 119 (Supabase / PostgreSQL)
-- Template padrão do "comprovante de compra" — segue exatamente o
-- formato pedido: Dados do Cliente, Produto, Valores, Garantia,
-- Observações, assinaturas, QR code.
-- ============================================================================

insert into documento_templates (loja_id, tipo_documento, formato, nome, padrao, conteudo_html)
select id, 'comprovante_aparelho', 'a4', 'Padrão A4', true, $HTML$
<div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto;">
  <div style="text-align:center; border-bottom: 3px solid #2643D6; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 20px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>
    <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">Comprovante de compra Nº {{numero_documento}}</div>
    <div style="font-size: 11px; color: #666;">{{data_emissao}}</div>
  </div>

  <div style="margin-bottom: 14px;">
    <div style="font-size: 12px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:3px;">Dados do Cliente</div>
    <div style="font-size: 13px; line-height:1.7;">
      <div><strong>Nome:</strong> {{cliente_nome}}</div>
      <div><strong>CPF:</strong> {{cliente_cpf}}</div>
      <div><strong>Telefone:</strong> {{cliente_whatsapp}}</div>
      <div><strong>Endereço:</strong> {{cliente_endereco}}</div>
    </div>
  </div>

  <div style="margin-bottom: 14px;">
    <div style="font-size: 12px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:3px;">Produto</div>
    <div style="font-size: 13px; line-height:1.7;">
      <div><strong>Modelo:</strong> {{aparelho_modelo}}</div>
      <div><strong>Cor:</strong> {{aparelho_cor}}</div>
      <div><strong>Armazenamento:</strong> {{aparelho_memoria}}</div>
      <div><strong>IMEI:</strong> {{aparelho_imei}}</div>
      <div><strong>Estado:</strong> {{aparelho_estado}}</div>
    </div>
  </div>

  <div style="margin-bottom: 14px;">
    <div style="font-size: 12px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:3px;">Valores</div>
    <div style="font-size: 13px; line-height:1.7;">
      <div><strong>Valor do aparelho:</strong> {{valor_aparelho}}</div>
      <div><strong>Entrada:</strong> {{valor_entrada}}</div>
      <div><strong>Forma de pagamento:</strong> {{forma_pagamento}}</div>
      <div><strong>Saldo:</strong> {{valor_saldo}}</div>
    </div>
  </div>

  <div style="margin-bottom: 14px;">
    <div style="font-size: 12px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:3px;">Garantia</div>
    <div style="font-size: 12px; line-height:1.6; color:#333;">{{garantia}}</div>
  </div>

  <div style="margin-bottom: 20px;">
    <div style="font-size: 12px; text-transform:uppercase; color:#888; font-weight:700; margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:3px;">Observações</div>
    <div style="font-size: 12px; line-height:1.6; color:#333;">{{observacoes}}</div>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top: 40px;">
    <div style="text-align:center; width: 45%;">
      <div style="border-top: 1px solid #333; padding-top:6px; font-size: 11px;">Assinatura do Cliente</div>
    </div>
    <div style="text-align:center; width: 45%;">
      <div style="border-top: 1px solid #333; padding-top:6px; font-size: 11px;">Assinatura da Neotec</div>
    </div>
  </div>

  <div style="text-align:center; margin-top: 20px;">
    {{{qr_code}}}
  </div>
</div>
$HTML$
from lojas
on conflict (loja_id, tipo_documento, formato) where padrao = true do nothing;

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 119
-- ============================================================================
