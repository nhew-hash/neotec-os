-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 206 (Supabase / PostgreSQL)
-- Módulo de Crediário — motor de crédito, fiador, ofertas, parcelas,
-- WhatsApp de Cobrança, bot de cobrança, pagamento desacoplado,
-- renegociação, upgrade, dashboards, permissões granulares.
--
-- Segurança de schema: status_crediario do aparelho fica em COLUNA
-- PRÓPRIA (não mexe no enum de status de venda/loja, que é ponto cego
-- fora do histórico de migração visível — mais seguro não arriscar).
-- ============================================================================

-- ---- Extensão de cliente pra análise de crédito ----
alter table clientes add column if not exists rg text;
alter table clientes add column if not exists estado_civil text;
alter table clientes add column if not exists profissao text;
alter table clientes add column if not exists empresa_trabalho text;
alter table clientes add column if not exists tempo_trabalho_meses integer;
alter table clientes add column if not exists renda_declarada numeric(12,2);
alter table clientes add column if not exists tipo_renda text check (tipo_renda in ('clt', 'autonomo', 'empresario', 'aposentado', 'outro'));
alter table clientes add column if not exists frequencia_renda text check (frequencia_renda in ('diaria', 'semanal', 'quinzenal', 'mensal', 'variavel'));
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists complemento text;
alter table clientes add column if not exists bairro text;
alter table clientes add column if not exists cep text;

-- ---- Referências pessoais (nome/telefone/relação) ----
create table if not exists clientes_referencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  telefone text,
  relacao text,
  created_at timestamptz not null default now()
);

-- ---- Fiador — entidade própria, cadastro semelhante ao cliente, analisado separadamente ----
create table if not exists crediario_fiadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null,
  rg text,
  data_nascimento date,
  telefone text,
  email text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  profissao text,
  renda_declarada numeric(12,2),
  relacao_com_cliente text,
  status_analise text not null default 'pendente' check (status_analise in ('pendente', 'aprovado', 'reprovado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crediario_fiadores_cpf on crediario_fiadores(cpf);

create table if not exists crediario_fiador_analises (
  id uuid primary key default gen_random_uuid(),
  fiador_id uuid not null references crediario_fiadores(id) on delete cascade,
  analisado_por uuid references usuarios(id),
  resultado text not null check (resultado in ('aprovado', 'reprovado')),
  motivo text,
  created_at timestamptz not null default now()
);

create table if not exists crediario_fiador_documentos (
  id uuid primary key default gen_random_uuid(),
  fiador_id uuid not null references crediario_fiadores(id) on delete cascade,
  url text not null,
  descricao text,
  created_at timestamptz not null default now()
);

-- ---- Classes de risco — A+/A/B/C/D/E, tudo configurável ----
create table if not exists crediario_classes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null,
  score_minimo integer not null,
  score_maximo integer not null,
  limite_maximo numeric(12,2) not null,
  entrada_minima_pct numeric(5,2) not null default 0,
  prazo_maximo_meses integer not null,
  encargos_pct numeric(5,2) not null default 0,
  fiador_obrigatorio boolean not null default false,
  valor_maximo_exposicao numeric(12,2),
  frequencias_permitidas text[] not null default array['mensal'],
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Classes padrão — administrador pode alterar tudo depois, nada fixo no código.
insert into crediario_classes (nome, ordem, score_minimo, score_maximo, limite_maximo, entrada_minima_pct, prazo_maximo_meses, fiador_obrigatorio, frequencias_permitidas)
select * from (values
  ('A+', 1, 90, 100, 6000::numeric, 10::numeric, 18, false, array['diaria','semanal','quinzenal','mensal']),
  ('A', 2, 80, 89, 4500::numeric, 15::numeric, 15, false, array['semanal','quinzenal','mensal']),
  ('B', 3, 65, 79, 3000::numeric, 20::numeric, 12, false, array['semanal','quinzenal','mensal']),
  ('C', 4, 50, 64, 2000::numeric, 25::numeric, 10, true, array['semanal','quinzenal']),
  ('D', 5, 35, 49, 1200::numeric, 35::numeric, 8, true, array['semanal']),
  ('E', 6, 0, 34, 700::numeric, 45::numeric, 6, true, array['semanal'])
) as v(nome, ordem, score_minimo, score_maximo, limite_maximo, entrada_minima_pct, prazo_maximo_meses, fiador_obrigatorio, frequencias_permitidas)
where not exists (select 1 from crediario_classes);

-- ---- Política de crédito — parâmetros gerais, únicos, configuráveis ----
create table if not exists crediario_politicas (
  id text primary key default 'default',
  aceita_negativado boolean not null default true,
  peso_score_pagamento_neotec integer not null default 40,
  peso_score_bureau integer not null default 30,
  peso_score_estabilidade integer not null default 15,
  peso_score_entrada integer not null default 15,
  entrada_extra_negativado_pct numeric(5,2) not null default 15,
  prazo_reducao_negativado_meses integer not null default 2,
  fiador_obrigatorio_negativado boolean not null default true,
  exposicao_maxima_carteira numeric(14,2),
  updated_at timestamptz not null default now()
);
insert into crediario_politicas (id) values ('default') on conflict (id) do nothing;

-- ---- Catálogo de aparelhos elegíveis pro crediário — config própria, nunca duplica produtos/aparelhos ----
create table if not exists crediario_aparelhos_config (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id),
  valor_referencia numeric(12,2) not null,
  entrada_minima numeric(12,2) not null default 0,
  prazo_minimo_meses integer not null default 1,
  prazo_maximo_meses integer not null,
  valor_opcao_aquisicao numeric(12,2),
  margem_minima_pct numeric(5,2) not null default 0,
  classe_minima_id uuid references crediario_classes(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (produto_id)
);

-- ---- Proposta de análise — inicia quando o vendedor clica "Nova análise" ----
create table if not exists crediario_propostas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  vendedor_id uuid references usuarios(id),
  status text not null default 'em_analise' check (status in ('em_analise', 'aprovada', 'reprovada', 'convertida_contrato', 'cancelada')),
  score_neotec integer,
  classe_id uuid references crediario_classes(id),
  limite_recomendado numeric(12,2),
  possui_restricao boolean not null default false,
  fiador_id uuid references crediario_fiadores(id),
  observacoes text,
  aprovado_por uuid references usuarios(id),
  motivo_decisao text,
  created_at timestamptz not null default now(),
  decidido_em timestamptz
);
create index if not exists idx_crediario_propostas_cliente on crediario_propostas(cliente_id);

create table if not exists crediario_scores (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references crediario_propostas(id) on delete cascade,
  score_final integer not null,
  breakdown jsonb not null default '{}'::jsonb,
  possui_restricao_bureau boolean not null default false,
  fonte_bureau text,
  consultado_em timestamptz not null default now()
);

create table if not exists crediario_decisoes (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references crediario_propostas(id) on delete cascade,
  decidido_por uuid references usuarios(id),
  decisao text not null check (decisao in ('aprovado', 'reprovado')),
  score_no_momento integer,
  classe_no_momento text,
  limite_concedido numeric(12,2),
  motivo text,
  created_at timestamptz not null default now()
);

-- ---- Oferta — o que o motor calculou pra cada aparelho x frequência, dentro de uma proposta ----
create table if not exists crediario_ofertas (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references crediario_propostas(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  frequencia_pagamento text not null check (frequencia_pagamento in ('diaria', 'semanal', 'quinzenal', 'mensal')),
  valor_entrada numeric(12,2) not null,
  numero_pagamentos integer not null,
  valor_pagamento numeric(12,2) not null,
  valor_total_contratado numeric(12,2) not null,
  status text not null check (status in ('aprovado', 'entrada_maior', 'nao_disponivel')),
  motivo_indisponivel text,
  selecionada boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_crediario_ofertas_proposta on crediario_ofertas(proposta_id);

-- ---- Escada de crédito — histórico próprio da Neotec por cliente ----
create table if not exists crediario_cliente_historico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) unique,
  score_atual integer,
  limite_atual numeric(12,2) not null default 0,
  limite_disponivel numeric(12,2) not null default 0,
  contratos_concluidos integer not null default 0,
  contratos_ativos integer not null default 0,
  parcelas_pagas integer not null default 0,
  parcelas_atrasadas integer not null default 0,
  dias_medios_atraso numeric(6,1) not null default 0,
  maior_atraso_dias integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists crediario_limite_historico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  limite_anterior numeric(12,2),
  limite_novo numeric(12,2) not null,
  motivo text not null,
  alterado_por uuid references usuarios(id),
  created_at timestamptz not null default now()
);

-- ---- Frequência de pagamento — habilitável/desabilitável pelo admin ----
create table if not exists crediario_frequencias (
  id text primary key,
  nome text not null,
  dias_intervalo integer not null,
  ativa boolean not null default true
);
insert into crediario_frequencias (id, nome, dias_intervalo) values
  ('diaria', 'Diária', 1), ('semanal', 'Semanal', 7), ('quinzenal', 'Quinzenal', 15), ('mensal', 'Mensal', 30)
on conflict (id) do nothing;

-- ---- Contrato de crediário — vincula contrato (módulo já existente) a condições financeiras de crediário ----
alter table contratos add column if not exists proposta_id uuid references crediario_propostas(id);
alter table contratos add column if not exists oferta_id uuid references crediario_ofertas(id);

-- status próprio do aparelho dentro do crediário — nunca mistura com o status de venda da loja.
alter table aparelhos add column if not exists status_crediario text check (status_crediario in (
  'em_estoque', 'reservado_crediario', 'em_locacao', 'atrasado', 'devolvido', 'encerrado', 'adquirido', 'perdido_danificado'
));
alter table aparelhos add column if not exists contrato_crediario_atual_id uuid references contratos(id);

-- ---- Parcelas ----
create table if not exists crediario_parcelas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  numero integer not null,
  frequencia text not null,
  valor_original numeric(12,2) not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'vencendo', 'pago', 'atrasado', 'negociado', 'cancelado')),
  data_pagamento timestamptz,
  valor_pago numeric(12,2),
  dias_atraso integer not null default 0,
  boleto_url text,
  pix_copia_cola text,
  id_externo_pagamento text,
  created_at timestamptz not null default now(),
  unique (contrato_id, numero)
);
create index if not exists idx_crediario_parcelas_contrato on crediario_parcelas(contrato_id);
create index if not exists idx_crediario_parcelas_vencimento on crediario_parcelas(vencimento) where status in ('pendente', 'vencendo', 'atrasado');

create table if not exists crediario_transacoes (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references crediario_parcelas(id),
  provider text not null,
  id_externo text,
  valor numeric(12,2) not null,
  status text not null check (status in ('pendente', 'confirmado', 'falhou', 'estornado')),
  metodo text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_crediario_transacoes_parcela on crediario_transacoes(parcela_id);
create index if not exists idx_crediario_transacoes_id_externo on crediario_transacoes(id_externo);

-- ---- Renegociação — só usuário autorizado, nunca o bot ----
create table if not exists crediario_renegociacoes (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id),
  parcela_id uuid references crediario_parcelas(id),
  nova_data date,
  novo_valor numeric(12,2),
  entrada_renegociacao numeric(12,2),
  desconto_autorizado numeric(12,2),
  encargos_autorizados numeric(12,2),
  observacao text,
  aprovado_por uuid references usuarios(id) not null,
  created_at timestamptz not null default now()
);

-- ---- Auditoria geral do crediário — não apagável ----
create table if not exists crediario_auditoria (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  entidade_id uuid not null,
  acao text not null,
  usuario_id uuid references usuarios(id),
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_crediario_auditoria_entidade on crediario_auditoria(entidade, entidade_id);

-- ---- WhatsApp de Cobrança — número PRÓPRIO, nunca o comercial nem o da Prostec ----
create table if not exists integracoes_whatsapp_cobranca (
  id uuid primary key default gen_random_uuid(),
  phone_number_id text,
  access_token text,
  numero text,
  status text not null default 'desconectado' check (status in ('conectado', 'desconectado', 'erro', 'aguardando_qr', 'conectando')),
  bot_ativo boolean not null default true,
  dias_para_humano integer not null default 7,
  ultima_conexao timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into integracoes_whatsapp_cobranca (status) select 'desconectado' where not exists (select 1 from integracoes_whatsapp_cobranca);

-- ---- Régua de cobrança — configurável, nunca hardcoded ----
create table if not exists crediario_regua_cobranca (
  id uuid primary key default gen_random_uuid(),
  dias_offset integer not null, -- negativo = antes do vencimento, 0 = no dia, positivo = depois
  mensagem text not null,
  ativo boolean not null default true,
  unique (dias_offset)
);
insert into crediario_regua_cobranca (dias_offset, mensagem) values
  (-7, 'Olá! Passando pra lembrar que sua parcela da Neotec vence em 7 dias. 😊'),
  (-3, 'Oi! Sua parcela vence em 3 dias. Qualquer dúvida, é só chamar.'),
  (-1, 'Sua parcela vence amanhã. Se precisar da segunda via, estou por aqui.'),
  (0, 'Sua parcela vence hoje. Segue a opção de pagamento.'),
  (1, 'Identificamos que o pagamento ainda não foi compensado. Caso já tenha pago, pode desconsiderar.'),
  (3, 'Passando de novo — o pagamento ainda não foi identificado por aqui.'),
  (7, 'ENCAMINHAR_HUMANO')
on conflict (dias_offset) do nothing;

create table if not exists crediario_conversas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references contratos(id),
  cliente_id uuid references clientes(id),
  telefone text not null unique,
  bot_ativo boolean not null default true,
  responsavel_id uuid references usuarios(id),
  ultima_mensagem_em timestamptz,
  nao_lidas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crediario_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references crediario_conversas(id) on delete cascade,
  remetente text not null check (remetente in ('cliente', 'bot', 'humano')),
  conteudo text not null,
  created_at timestamptz not null default now()
);

create table if not exists crediario_cobranca_eventos (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid references crediario_parcelas(id),
  tipo text not null,
  descricao text,
  created_at timestamptz not null default now()
);

-- ---- Permissões granulares — aprovar crédito é ação distinta de ver dashboard ----
create table if not exists crediario_permissoes_usuario (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  permissao text not null check (permissao in (
    'visualizar', 'analisar', 'aprovar', 'reprovar', 'renegociar', 'alterar_limite',
    'editar_politica', 'ver_documentos', 'ver_financeiro', 'admin'
  )),
  primary key (usuario_id, permissao)
);

drop trigger if exists trg_crediario_fiadores_updated_at on crediario_fiadores;
create trigger trg_crediario_fiadores_updated_at before update on crediario_fiadores for each row execute function set_updated_at();
drop trigger if exists trg_crediario_politicas_updated_at on crediario_politicas;
create trigger trg_crediario_politicas_updated_at before update on crediario_politicas for each row execute function set_updated_at();
drop trigger if exists trg_crediario_cliente_historico_updated_at on crediario_cliente_historico;
create trigger trg_crediario_cliente_historico_updated_at before update on crediario_cliente_historico for each row execute function set_updated_at();
drop trigger if exists trg_integracoes_whatsapp_cobranca_updated_at on integracoes_whatsapp_cobranca;
create trigger trg_integracoes_whatsapp_cobranca_updated_at before update on integracoes_whatsapp_cobranca for each row execute function set_updated_at();
drop trigger if exists trg_crediario_conversas_updated_at on crediario_conversas;
create trigger trg_crediario_conversas_updated_at before update on crediario_conversas for each row execute function set_updated_at();

-- ============================================================================
-- RLS — visualizar é mais aberto (staff da loja), aprovar/reprovar
-- exige permissão granular específica (checada NA APLICAÇÃO, já que
-- RLS por si só não modela bem "aprovar vs ver" com a mesma clareza).
-- ============================================================================

alter table clientes_referencias enable row level security;
alter table crediario_fiadores enable row level security;
alter table crediario_fiador_analises enable row level security;
alter table crediario_fiador_documentos enable row level security;
alter table crediario_classes enable row level security;
alter table crediario_politicas enable row level security;
alter table crediario_aparelhos_config enable row level security;
alter table crediario_propostas enable row level security;
alter table crediario_scores enable row level security;
alter table crediario_decisoes enable row level security;
alter table crediario_ofertas enable row level security;
alter table crediario_cliente_historico enable row level security;
alter table crediario_limite_historico enable row level security;
alter table crediario_frequencias enable row level security;
alter table crediario_parcelas enable row level security;
alter table crediario_transacoes enable row level security;
alter table crediario_renegociacoes enable row level security;
alter table crediario_auditoria enable row level security;
alter table integracoes_whatsapp_cobranca enable row level security;
alter table crediario_regua_cobranca enable row level security;
alter table crediario_conversas enable row level security;
alter table crediario_mensagens enable row level security;
alter table crediario_cobranca_eventos enable row level security;
alter table crediario_permissoes_usuario enable row level security;

drop policy if exists "clientes_referencias_staff" on clientes_referencias;
create policy "clientes_referencias_staff" on clientes_referencias for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "crediario_fiadores_staff" on crediario_fiadores;
create policy "crediario_fiadores_staff" on crediario_fiadores for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));
drop policy if exists "crediario_fiador_analises_staff" on crediario_fiador_analises;
create policy "crediario_fiador_analises_staff" on crediario_fiador_analises for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_fiador_documentos_staff" on crediario_fiador_documentos;
create policy "crediario_fiador_documentos_staff" on crediario_fiador_documentos for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "crediario_classes_admin" on crediario_classes;
create policy "crediario_classes_admin" on crediario_classes for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_politicas_admin" on crediario_politicas;
create policy "crediario_politicas_admin" on crediario_politicas for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_aparelhos_config_admin" on crediario_aparelhos_config;
create policy "crediario_aparelhos_config_admin" on crediario_aparelhos_config for all using (current_user_cargo() in ('admin', 'gerente'));

drop policy if exists "crediario_propostas_staff" on crediario_propostas;
create policy "crediario_propostas_staff" on crediario_propostas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));
drop policy if exists "crediario_scores_staff" on crediario_scores;
create policy "crediario_scores_staff" on crediario_scores for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));
drop policy if exists "crediario_decisoes_staff" on crediario_decisoes;
create policy "crediario_decisoes_staff" on crediario_decisoes for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_ofertas_staff" on crediario_ofertas;
create policy "crediario_ofertas_staff" on crediario_ofertas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "crediario_cliente_historico_staff" on crediario_cliente_historico;
create policy "crediario_cliente_historico_staff" on crediario_cliente_historico for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));
drop policy if exists "crediario_limite_historico_staff" on crediario_limite_historico;
create policy "crediario_limite_historico_staff" on crediario_limite_historico for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_frequencias_staff" on crediario_frequencias;
create policy "crediario_frequencias_staff" on crediario_frequencias for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

drop policy if exists "crediario_parcelas_staff" on crediario_parcelas;
create policy "crediario_parcelas_staff" on crediario_parcelas for all using (current_user_cargo() in ('admin', 'gerente', 'vendedor', 'caixa'));
drop policy if exists "crediario_transacoes_staff" on crediario_transacoes;
create policy "crediario_transacoes_staff" on crediario_transacoes for all using (current_user_cargo() in ('admin', 'gerente', 'caixa'));
drop policy if exists "crediario_renegociacoes_staff" on crediario_renegociacoes;
create policy "crediario_renegociacoes_staff" on crediario_renegociacoes for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_auditoria_staff" on crediario_auditoria;
create policy "crediario_auditoria_staff" on crediario_auditoria for select using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_auditoria_insert" on crediario_auditoria;
create policy "crediario_auditoria_insert" on crediario_auditoria for insert with check (true);

drop policy if exists "integracoes_whatsapp_cobranca_admin" on integracoes_whatsapp_cobranca;
create policy "integracoes_whatsapp_cobranca_admin" on integracoes_whatsapp_cobranca for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_regua_cobranca_admin" on crediario_regua_cobranca;
create policy "crediario_regua_cobranca_admin" on crediario_regua_cobranca for all using (current_user_cargo() in ('admin', 'gerente'));
drop policy if exists "crediario_conversas_staff" on crediario_conversas;
create policy "crediario_conversas_staff" on crediario_conversas for all using (current_user_cargo() in ('admin', 'gerente', 'caixa'));
drop policy if exists "crediario_mensagens_staff" on crediario_mensagens;
create policy "crediario_mensagens_staff" on crediario_mensagens for all using (current_user_cargo() in ('admin', 'gerente', 'caixa'));
drop policy if exists "crediario_cobranca_eventos_staff" on crediario_cobranca_eventos;
create policy "crediario_cobranca_eventos_staff" on crediario_cobranca_eventos for select using (current_user_cargo() in ('admin', 'gerente', 'caixa'));

drop policy if exists "crediario_permissoes_usuario_admin" on crediario_permissoes_usuario;
create policy "crediario_permissoes_usuario_admin" on crediario_permissoes_usuario for all using (current_user_cargo() = 'admin');
drop policy if exists "crediario_permissoes_usuario_self_select" on crediario_permissoes_usuario;
create policy "crediario_permissoes_usuario_self_select" on crediario_permissoes_usuario for select using (usuario_id = auth.uid());

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 206
-- ============================================================================
