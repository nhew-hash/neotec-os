-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 176 (Supabase / PostgreSQL)
-- Separa o CRM misto (venda + assistência juntos) em dois funis
-- distintos. Assistência reaproveita o status_os já existente.
--
-- 100% SEGURA DE RODAR DE NOVO — cada parte confere se já foi feita
-- antes de fazer, não importa em qual ponto travou numa tentativa anterior.
-- ============================================================================

alter table crm_etapas add column if not exists tipo text not null default 'venda' check (tipo in ('venda', 'assistencia'));

-- Reorganiza as etapas — só roda se ainda não tiver sido feito (confere
-- se já existe mais de 1 etapa de venda; se só tem a "Lead" sozinha ou
-- o funil antigo de 13, ainda precisa reorganizar).
do $$
declare
  v_etapa_lead_id uuid;
  v_ja_reorganizado boolean;
begin
  select count(*) > 1 into v_ja_reorganizado from crm_etapas where tipo = 'venda' and nome in ('Em atendimento', 'Em negociação', 'Orçamento', 'Venda feita', 'Pós-venda', 'Oportunidades futuras');

  if not v_ja_reorganizado then
    select id into v_etapa_lead_id from crm_etapas where nome = 'Lead' and tipo = 'venda' limit 1;

    if v_etapa_lead_id is null then
      insert into crm_etapas (nome, ordem, cor, tipo) values ('Lead', 9999, '#8A90A0', 'venda')
      returning id into v_etapa_lead_id;
    end if;

    update crm_cards set etapa_id = v_etapa_lead_id
    where etapa_id in (select id from crm_etapas where id != v_etapa_lead_id);

    delete from crm_etapas where id != v_etapa_lead_id;

    update crm_etapas set ordem = 1 where id = v_etapa_lead_id;

    insert into crm_etapas (nome, ordem, cor, tipo) values
      ('Em atendimento', 2, '#4CA9D9', 'venda'),
      ('Em negociação', 3, '#E4572E', 'venda'),
      ('Orçamento', 4, '#D97706', 'venda'),
      ('Venda feita', 5, '#16A34A', 'venda'),
      ('Pós-venda', 6, '#4CA9D9', 'venda'),
      ('Oportunidades futuras', 7, '#8A90A0', 'venda');
  end if;
end $$;

alter type status_os add value if not exists 'atendimento_encerrado';

-- Tipo enum só cria se ainda não existir — CREATE TYPE não tem
-- "if not exists" nativo, então confere na mão.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'origem_cliente_tipo') then
    create type origem_cliente_tipo as enum ('indicacao', 'porta_de_loja', 'instagram', 'anuncio', 'cliente_antigo');
  end if;
end $$;

alter table vendas add column if not exists origem_cliente origem_cliente_tipo;
alter table ordens_servico add column if not exists origem_cliente origem_cliente_tipo;

comment on column vendas.origem_cliente is 'De onde o cliente veio — indicação, porta de loja, Instagram, anúncio, ou já era cliente antigo.';
comment on column ordens_servico.origem_cliente is 'Mesmo campo, pro lado de assistência técnica.';

alter table crm_cards add column if not exists convertido_em_os_id uuid references ordens_servico(id) on delete set null;
alter table ordens_servico add column if not exists convertido_de_card_id uuid references crm_cards(id) on delete set null;
alter table ordens_servico add column if not exists gerou_card_venda_id uuid references crm_cards(id) on delete set null;

alter table ordens_servico add column if not exists forma_pagamento text;
alter table ordens_servico add column if not exists valor_cobrado numeric(12,2);

comment on column ordens_servico.forma_pagamento is 'Preenchido só ao finalizar o atendimento — Pix, Cartão, Dinheiro etc.';
comment on column ordens_servico.valor_cobrado is 'Valor cobrado do cliente no reparo, preenchido ao finalizar.';

notify pgrst, 'reload schema';

-- ============================================================================
-- Melhora o template A4 de OS — CNPJ, origem do cliente, e seção de
-- pagamento. O replace() é seguro de rodar de novo sozinho: se o texto
-- já foi trocado antes, a busca não encontra nada e não faz nada
-- (não duplica, não quebra).
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

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 176
-- ============================================================================
