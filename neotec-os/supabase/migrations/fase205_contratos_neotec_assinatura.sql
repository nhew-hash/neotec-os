-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 205 (Supabase / PostgreSQL)
-- Módulo de Contratos — Neotec Assinatura. Escopo estrito: geração,
-- assinatura, armazenamento, versionamento e auditoria de contratos.
-- NÃO inclui crédito, cobrança, WhatsApp ou pagamento.
-- ============================================================================

-- ============================================================================
-- Reaproveita o sistema de assinatura em tela (canvas) que já existe
-- (assinaturas_digitais, Fase 50) — nunca reinventa, só estende os
-- enums com os valores que o contrato precisa.
-- ============================================================================
-- ============================================================================
-- Bucket privado pros PDFs de contrato — mesmo padrão já usado pra
-- assinaturas (Fase 50): nunca público, sempre via signed URL.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

alter type tipo_documento_impressao add value if not exists 'contrato';
alter type tipo_documento_impressao add value if not exists 'aditivo';
alter type tipo_assinante_documento add value if not exists 'fiador';
alter type tipo_assinante_documento add value if not exists 'neotec';

-- Dados jurídicos da empresa — faltavam pra popular o contrato sem
-- hardcoded (pedido explícito da seção 3 do documento).
alter table lojas add column if not exists razao_social text;
alter table lojas add column if not exists cnpj text;
alter table lojas add column if not exists cidade text;
alter table lojas add column if not exists estado text;

create table if not exists contratos_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  versao text not null,
  conteudo text not null,
  revisado_juridicamente boolean not null default false,
  ativo boolean not null default false,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_contratos_modelos_ativo on contratos_modelos(ativo) where ativo = true;

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  modelo_id uuid not null references contratos_modelos(id),
  cliente_id uuid not null references clientes(id),
  fiador_id uuid,
  aparelho_id uuid references aparelhos(id),
  status text not null default 'rascunho' check (status in (
    'rascunho', 'em_revisao', 'aguardando_assinatura', 'assinatura_parcial',
    'assinado', 'ativo', 'encerrando', 'encerrado', 'cancelado', 'rescindido'
  )),
  nivel_formalizacao text not null default 'eletronico' check (nivel_formalizacao in ('eletronico', 'eletronico_avancado', 'qualificado', 'adicional_cartorio')),
  valor_entrada numeric(12,2),
  frequencia_pagamento text check (frequencia_pagamento in ('diaria', 'semanal', 'quinzenal', 'mensal')),
  numero_pagamentos integer,
  valor_pagamento numeric(12,2),
  data_inicio date,
  data_fim date,
  tem_opcao_aquisicao boolean not null default false,
  valor_opcao_aquisicao numeric(12,2),
  cartorio_nome text,
  cartorio_protocolo text,
  cartorio_data date,
  cartorio_documento_url text,
  conteudo_final text,
  pdf_url text,
  hash_documento text,
  criado_por uuid references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assinado_em timestamptz,
  encerrado_em timestamptz
);
create index if not exists idx_contratos_cliente on contratos(cliente_id);
create index if not exists idx_contratos_status on contratos(status);
create index if not exists idx_contratos_aparelho on contratos(aparelho_id);

create table if not exists contratos_signatarios (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  papel text not null check (papel in ('cliente', 'fiador', 'neotec')),
  nome text not null,
  cpf text not null,
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'visualizado', 'assinado', 'recusado', 'expirado', 'cancelado')),
  metodo_assinatura text,
  id_externo text,
  ip_assinatura text,
  data_hora_assinatura timestamptz,
  evidencias jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_contratos_signatarios_contrato on contratos_signatarios(contrato_id);

create table if not exists contratos_documentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  tipo text not null check (tipo in (
    'contrato_principal', 'termo_entrega', 'termo_devolucao', 'termo_aquisicao',
    'aditivo', 'documento_cliente', 'documento_fiador', 'evidencia_assinatura', 'foto_aparelho'
  )),
  url text not null,
  descricao text,
  imutavel boolean not null default false,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_contratos_documentos_contrato on contratos_documentos(contrato_id);

create table if not exists contratos_eventos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  tipo text not null,
  usuario_id uuid references usuarios(id),
  ip text,
  observacao text,
  created_at timestamptz not null default now()
);
create index if not exists idx_contratos_eventos_contrato on contratos_eventos(contrato_id, created_at);

create table if not exists contratos_aditivos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  numero_aditivo integer not null,
  motivo text not null,
  conteudo text not null,
  pdf_url text,
  status text not null default 'rascunho' check (status in ('rascunho', 'aguardando_assinatura', 'assinado', 'cancelado')),
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now(),
  assinado_em timestamptz,
  unique (contrato_id, numero_aditivo)
);

create table if not exists contratos_termos_entrega (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  data_hora timestamptz not null default now(),
  local text,
  responsavel_id uuid references usuarios(id),
  estado_conservacao text,
  saude_bateria integer,
  acessorios text[],
  fotos text[] not null default '{}',
  observacoes text,
  assinatura_cliente_confirmada boolean not null default false,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists contratos_termos_devolucao (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  data_hora timestamptz not null default now(),
  responsavel_id uuid references usuarios(id),
  estado_aparelho text,
  saude_bateria integer,
  acessorios_devolvidos text[],
  danos_encontrados text,
  fotos text[] not null default '{}',
  observacoes text,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists contratos_termos_aquisicao (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  data_exercicio date not null default current_date,
  valor_pago numeric(12,2),
  forma_pagamento text,
  pdf_url text,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

create sequence if not exists seq_contratos_numero start 1;

create or replace function gerar_numero_contrato()
returns text
language sql
as $$
  select 'NEO-' || lpad(nextval('seq_contratos_numero')::text, 6, '0');
$$;

drop trigger if exists trg_contratos_updated_at on contratos;
create trigger trg_contratos_updated_at
  before update on contratos
  for each row execute function set_updated_at();

alter table contratos_modelos enable row level security;
alter table contratos enable row level security;
alter table contratos_signatarios enable row level security;
alter table contratos_documentos enable row level security;
alter table contratos_eventos enable row level security;
alter table contratos_aditivos enable row level security;
alter table contratos_termos_entrega enable row level security;
alter table contratos_termos_devolucao enable row level security;
alter table contratos_termos_aquisicao enable row level security;

drop policy if exists "contratos_modelos_staff" on contratos_modelos;
create policy "contratos_modelos_staff" on contratos_modelos for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "contratos_staff" on contratos;
create policy "contratos_staff" on contratos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "contratos_signatarios_staff" on contratos_signatarios;
create policy "contratos_signatarios_staff" on contratos_signatarios for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "contratos_documentos_staff" on contratos_documentos;
create policy "contratos_documentos_staff" on contratos_documentos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "contratos_eventos_staff" on contratos_eventos;
create policy "contratos_eventos_staff" on contratos_eventos for select using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));
drop policy if exists "contratos_eventos_insert_staff" on contratos_eventos;
create policy "contratos_eventos_insert_staff" on contratos_eventos for insert with check (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "contratos_aditivos_staff" on contratos_aditivos;
create policy "contratos_aditivos_staff" on contratos_aditivos for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "contratos_termos_entrega_staff" on contratos_termos_entrega;
create policy "contratos_termos_entrega_staff" on contratos_termos_entrega for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "contratos_termos_devolucao_staff" on contratos_termos_devolucao;
create policy "contratos_termos_devolucao_staff" on contratos_termos_devolucao for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "contratos_termos_aquisicao_staff" on contratos_termos_aquisicao;
create policy "contratos_termos_aquisicao_staff" on contratos_termos_aquisicao for all using (current_user_cargo() in ('admin', 'gerente'));

-- ============================================================================
-- MODELO PROVISÓRIO — marcado claramente como rascunho, NUNCA USAR EM
-- PRODUÇÃO sem revisão jurídica.
-- ============================================================================

insert into contratos_modelos (nome, versao, conteudo, revisado_juridicamente, ativo)
select
  '[MODELO PARA REVISAO JURIDICA - NAO UTILIZAR EM PRODUCAO] Contrato de Disponibilizacao de Aparelho com Opcao de Aquisicao',
  'v0.1-rascunho',
  'ESTE E UM MODELO PROVISORIO GERADO AUTOMATICAMENTE.
NAO POSSUI VALIDADE JURIDICA CONFIRMADA. SUBSTITUA PELO CONTRATO APROVADO PELO ADVOGADO DA NEOTEC ANTES DE USAR COM CLIENTE REAL.

---

CONTRATO No {{NUMERO_CONTRATO}}

CONTRATO DE DISPONIBILIZACAO DE APARELHO CELULAR COM OPCAO DE AQUISICAO

Pelo presente instrumento particular, de um lado:

{{NEOTEC_RAZAO_SOCIAL}}, CNPJ {{NEOTEC_CNPJ}}, com sede em {{NEOTEC_ENDERECO}}, {{NEOTEC_CIDADE}}/{{NEOTEC_ESTADO}}, doravante denominada NEOTEC;

e de outro lado:

{{CLIENTE_NOME}}, CPF {{CLIENTE_CPF}}, residente em {{CLIENTE_ENDERECO}}, {{CLIENTE_CIDADE}}/{{CLIENTE_ESTADO}}, doravante denominado CLIENTE;

{{SE_FIADOR}}
e ainda, na qualidade de fiador:

{{FIADOR_NOME}}, CPF {{FIADOR_CPF}}, residente em {{FIADOR_ENDERECO}}, {{FIADOR_CIDADE}}/{{FIADOR_ESTADO}}, doravante denominado FIADOR;
{{FIM_FIADOR}}

resolvem celebrar o presente contrato, mediante as clausulas e condicoes seguintes:

1. OBJETO

[REDACAO JURIDICA PENDENTE - descrever a disponibilizacao do aparelho, finalidade, condicoes de uso e responsabilidades das partes, conforme orientacao do advogado responsavel.]

2. IDENTIFICACAO DO APARELHO

Marca/Modelo: {{APARELHO_MODELO}}
Capacidade: {{APARELHO_MEMORIA}}
Cor: {{APARELHO_COR}}
IMEI: {{APARELHO_IMEI}}
Numero de serie: {{APARELHO_SERIAL}}
Estado de conservacao: {{APARELHO_ESTADO}}

3. PRAZO

Inicio: {{DATA_INICIO}}
Termino: {{DATA_FIM}}

4. CONDICOES FINANCEIRAS

Entrada: {{VALOR_ENTRADA}}
Frequencia de pagamento: {{FREQUENCIA_PAGAMENTO}}
Numero de pagamentos: {{NUMERO_PAGAMENTOS}}
Valor de cada pagamento: {{VALOR_PAGAMENTO}}
Primeiro vencimento: {{DATA_INICIO}}
Ultimo vencimento: {{DATA_FIM}}

[REDACAO JURIDICA PENDENTE - clausulas de forma de pagamento, consequencias de atraso, e demais condicoes financeiras, conforme orientacao do advogado.]

{{SE_OPCAO_AQUISICAO}}
5. OPCAO DE AQUISICAO

Valor da opcao de aquisicao: {{VALOR_OPCAO_AQUISICAO}}

[REDACAO JURIDICA PENDENTE - definir se ha opcao de aquisicao, preferencia, aquisicao condicionada, valor residual e demais condicoes, conforme orientacao do advogado. NAO presumir transferencia automatica de propriedade.]
{{FIM_OPCAO_AQUISICAO}}

6. RESPONSABILIDADES E ENCERRAMENTO

[REDACAO JURIDICA PENDENTE - condicoes de uso, responsabilidade por dano/perda/furto, regras de rescisao, devolucao e encerramento, conforme orientacao do advogado.]

7. ASSINATURAS

E por estarem assim justos e contratados, firmam o presente instrumento.

{{DATA_ASSINATURA}}

_______________________________
NEOTEC

_______________________________
CLIENTE - {{CLIENTE_NOME}}

{{SE_FIADOR}}
_______________________________
FIADOR - {{FIADOR_NOME}}
{{FIM_FIADOR}}
',
  false,
  true
where not exists (select 1 from contratos_modelos);

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 205
-- ============================================================================
