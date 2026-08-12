-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 176 (Supabase / PostgreSQL)
-- Separa o CRM misto (venda + assistência juntos) em dois funis
-- distintos. Assistência reaproveita o status_os já existente (que já
-- funciona como funil), só ganha um estágio final novo. Venda ganha
-- etapas novas, específicas de venda.
-- ============================================================================

-- Etapas ganham um "tipo" — nunca mais mistura venda com assistência
-- no mesmo board.
alter table crm_etapas add column if not exists tipo text not null default 'venda' check (tipo in ('venda', 'assistencia'));

-- Limpa as 13 etapas antigas misturadas — cards existentes migram pra
-- primeira etapa nova de venda (Lead), preserva o card em si, só
-- reorganiza onde ele aparece no board.
do $$
declare
  v_etapa_lead_id uuid;
begin
  -- Cria a etapa "Lead" nova ANTES de apagar as antigas, pra ter pra
  -- onde migrar os cards existentes sem perder nenhum.
  insert into crm_etapas (nome, ordem, cor, tipo) values ('Lead', 1, '#8A90A0', 'venda')
  returning id into v_etapa_lead_id;

  update crm_cards set etapa_id = v_etapa_lead_id
  where etapa_id in (select id from crm_etapas where id != v_etapa_lead_id);

  delete from crm_etapas where id != v_etapa_lead_id;
end $$;

-- Reinsere o funil de venda completo (a etapa Lead já existe da
-- migração acima, só completa o resto).
insert into crm_etapas (nome, ordem, cor, tipo) values
  ('Em atendimento', 2, '#4CA9D9', 'venda'),
  ('Em negociação', 3, '#E4572E', 'venda'),
  ('Orçamento', 4, '#D97706', 'venda'),
  ('Venda feita', 5, '#16A34A', 'venda'),
  ('Pós-venda', 6, '#4CA9D9', 'venda'),
  ('Oportunidades futuras', 7, '#8A90A0', 'venda');

-- Assistência reaproveita status_os (Fase 2) — ganha só um estágio
-- final novo, pra marcar quando o atendimento como um todo (não só a
-- entrega do aparelho) está encerrado de vez.
alter type status_os add value if not exists 'atendimento_encerrado';

-- Origem do cliente — de onde ele veio, pra venda e ordem de serviço.
create type origem_cliente_tipo as enum ('indicacao', 'porta_de_loja', 'instagram', 'anuncio', 'cliente_antigo');

alter table vendas add column if not exists origem_cliente origem_cliente_tipo;
alter table ordens_servico add column if not exists origem_cliente origem_cliente_tipo;

comment on column vendas.origem_cliente is 'De onde o cliente veio — indicação, porta de loja, Instagram, anúncio, ou já era cliente antigo.';
comment on column ordens_servico.origem_cliente is 'Mesmo campo, pro lado de assistência técnica.';

-- Card do CRM ganha um jeito de saber se já foi transferido pro outro
-- funil (assistência↔venda) — vira uma OS ou vira um card, dependendo
-- de qual lado o botão "mover" foi apertado.
alter table crm_cards add column if not exists convertido_em_os_id uuid references ordens_servico(id) on delete set null;
alter table ordens_servico add column if not exists convertido_de_card_id uuid references crm_cards(id) on delete set null;
alter table ordens_servico add column if not exists gerou_card_venda_id uuid references crm_cards(id) on delete set null;

alter table ordens_servico add column if not exists forma_pagamento text;
alter table ordens_servico add column if not exists valor_cobrado numeric(12,2);

comment on column ordens_servico.forma_pagamento is 'Preenchido só ao finalizar o atendimento — Pix, Cartão, Dinheiro etc.';
comment on column ordens_servico.valor_cobrado is 'Valor cobrado do cliente no reparo, preenchido ao finalizar.';

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 176
-- ============================================================================

-- ============================================================================
-- Melhora o template A4 de OS — CNPJ, origem do cliente, e seção de
-- pagamento (só aparece quando o atendimento foi finalizado).
-- ============================================================================
update documento_templates
set conteudo_html = replace(
  replace(
    conteudo_html,
    '<div style="font-size: 20px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>
      <div style="font-size: 12px; color: #666;">Assistência técnica especializada</div>',
    '<div style="font-size: 20px; font-weight: 700; color: #2643D6;">{{loja_nome}}</div>
      <div style="font-size: 10px; color: #666;">CNPJ 37.091.751/0001-70</div>
      <div style="font-size: 12px; color: #666;">Assistência técnica especializada</div>'
  ),
  '<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:24px;">
    <span><strong>Garantia:</strong> {{garantia}}</span>
    <span><strong>Acessórios entregues:</strong> ____________________________</span>
  </div>',
  '<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:12px;">
    <span><strong>Garantia:</strong> {{garantia}}</span>
    <span><strong>De onde veio:</strong> {{origem_cliente}}</span>
  </div>

  {{{bloco_pagamento}}}

  <div style="font-size:12px; margin-bottom:24px;">
    <strong>Acessórios entregues:</strong> ____________________________
  </div>'
)
where tipo_documento = 'os' and formato = 'a4' and padrao = true;
