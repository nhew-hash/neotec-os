-- ============================================================================
-- NEOTEC OS — MIGRAÇÃO FASE 217 (Supabase / PostgreSQL)
-- Pré-Análise de Crediário — formulário público, NÃO é aprovação de
-- crédito, só triagem inicial que vira notificação de WhatsApp pro
-- vendedor. Nunca reaproveita crediario_propostas (fluxo diferente:
-- ali é análise formal já com CPF/score, aqui é pré-triagem sem
-- documento nenhum).
-- ============================================================================

create table if not exists crediario_pre_analises (
  id uuid primary key default gen_random_uuid(),

  -- Cliente
  nome text not null,
  whatsapp text not null,

  -- Aparelho desejado
  aparelho_desejado text not null,

  -- Condições
  entrada numeric(12,2) not null check (entrada >= 0),
  parcela_desejada numeric(12,2) not null check (parcela_desejada >= 0),

  -- Aparelho na troca
  tem_aparelho_troca boolean not null default false,
  aparelho_troca_modelo text,
  aparelho_troca_estado text check (aparelho_troca_estado in ('excelente', 'bom', 'regular', 'com_defeito')),
  aparelho_troca_defeito text,

  -- Profissional
  trabalha boolean not null default false,
  tipo_trabalho text check (tipo_trabalho in ('clt', 'autonomo', 'empresario', 'servidor_publico', 'freelancer', 'outro')),
  tempo_trabalho text check (tempo_trabalho in ('menos_3_meses', '3_a_6_meses', '6_meses_a_1_ano', '1_a_2_anos', 'mais_2_anos')),
  tempo_registro_clt text check (tempo_registro_clt in ('menos_3_meses', '3_a_6_meses', '6_meses_a_1_ano', '1_a_2_anos', 'mais_2_anos')),
  renda_mensal numeric(12,2) not null check (renda_mensal >= 0),

  -- Família
  estado_civil text check (estado_civil in ('solteiro', 'casado', 'uniao_estavel', 'divorciado', 'viuvo')),
  dependentes text check (dependentes in ('nenhum', '1', '2', '3_ou_mais')),

  -- Moradia
  moradia text check (moradia in ('propria', 'alugada', 'com_familiares', 'financiada', 'outro')),
  tempo_moradia text check (tempo_moradia in ('menos_6_meses', '6_meses_a_1_ano', '1_a_2_anos', 'mais_2_anos')),

  -- Termo
  termo_aceito boolean not null default false,
  termo_aceito_em timestamptz,

  -- Indicador interno — NUNCA mostrado ao cliente, só ajuda o vendedor a priorizar.
  indicador text check (indicador in ('bom_potencial', 'analise_manual', 'baixo_potencial')),

  -- Gestão interna
  status text not null default 'novo' check (status in (
    'novo', 'em_analise', 'contatar_cliente', 'aguardando_documentos', 'aprovado', 'reprovado', 'venda_fechada', 'perdido'
  )),
  observacoes_internas text,
  notificacao_enviada boolean not null default false,
  origem text not null default 'pre_crediario',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_crediario_pre_analises_status on crediario_pre_analises(status);
create index if not exists idx_crediario_pre_analises_whatsapp on crediario_pre_analises(whatsapp);

-- Número de WhatsApp que recebe a notificação de nova pré-análise —
-- usa a MESMA integração de WhatsApp da loja já existente pra enviar
-- (nunca cria uma integração nova só pra isso), só precisa saber PRA
-- QUEM mandar.
alter table crediario_politicas add column if not exists whatsapp_notificacao_vendedor text;

drop trigger if exists trg_crediario_pre_analises_updated_at on crediario_pre_analises;
create trigger trg_crediario_pre_analises_updated_at before update on crediario_pre_analises for each row execute function set_updated_at();

alter table crediario_pre_analises enable row level security;

-- Qualquer um pode CRIAR (formulário público, sem login) — nunca pode LER/ALTERAR o que já existe.
drop policy if exists "crediario_pre_analises_insert_publico" on crediario_pre_analises;
create policy "crediario_pre_analises_insert_publico" on crediario_pre_analises for insert
  to anon with check (true);

drop policy if exists "crediario_pre_analises_staff" on crediario_pre_analises;
create policy "crediario_pre_analises_staff" on crediario_pre_analises for all
  using (current_user_cargo() in ('admin', 'gerente', 'vendedor'));

notify pgrst, 'reload schema';

-- ============================================================================
-- FIM DA MIGRAÇÃO FASE 217
-- ============================================================================
