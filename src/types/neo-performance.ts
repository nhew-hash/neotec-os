// ============================================================================
// NEO PERFORMANCE — Fase 1
// Tipos do módulo novo, em arquivo separado de database.ts (que é
// mantido manualmente a partir do schema — ver resto do types/) para não
// disputar merge com o restante do schema em paralelo.
// ============================================================================

export type PlataformaAds = "meta" | "google";
export type StatusSyncAds = "pendente" | "sucesso" | "erro";
export type OperacaoCampanha = "local" | "ecommerce";
export type TipoDiagnosticoPerformance =
  | "cac_elevado"
  | "criativo_fadiga"
  | "conversas_sem_venda"
  | "venda_sem_margem"
  | "campanha_eficiente";
export type SeveridadeDiagnostico = "info" | "atencao" | "critico";
export type StatusDecisaoPerformance = "registrado" | "executado" | "aguardando_avaliacao" | "avaliado";

export interface FeatureFlag {
  id: string;
  loja_id: string;
  chave: string;
  ativo: boolean;
  descricao: string | null;
  updated_at: string;
}

export interface NeoPerformanceConfig {
  id: string;
  loja_id: string;
  segmento: string | null;
  cidades: string[];
  regioes: string[];
  ticket_medio_alvo: number | null;
  margem_media_alvo: number | null;
  cac_desejado: number | null;
  meta_faturamento_mensal: number | null;
  meta_vendas_mensal: number | null;
  canais: string[];
  objetivos: string | null;
  horario_atendimento: string | null;
  limite_diario: number | null;
  limite_semanal: number | null;
  limite_mensal: number | null;
  limite_por_campanha: number | null;
  max_aumento_automatico_pct: number | null;
  max_reducao_automatica_pct: number | null;
  cac_maximo: number | null;
  margem_minima_pct: number | null;
  roas_minimo: number | null;
  // Fase 3 — autonomia e kill switch (fase260)
  modo_autonomia: ModoAutonomia;
  automacoes_pausadas: boolean;
  automacoes_pausadas_em: string | null;
  gasto_maximo_sem_venda: number | null;
  limite_criacao_campanhas_dia: number;
  limite_alteracoes_dia: number;
  updated_at: string;
}

export interface AdsConta {
  id: string;
  loja_id: string;
  plataforma: PlataformaAds;
  conta_externa_id: string;
  nome: string | null;
  ativo: boolean;
  conectado_em: string | null;
  pausada_em: string | null;
  pausada_motivo: string | null;
  created_at: string;
}

export interface AdsCampanha {
  id: string;
  loja_id: string;
  conta_id: string;
  plataforma: PlataformaAds;
  external_campaign_id: string;
  nome: string;
  objetivo: string | null;
  status: string | null;
  orcamento_diario: number | null;
  operacao: OperacaoCampanha;
  created_at: string;
}

export interface AdsMetricaDiaria {
  id: string;
  campanha_id: string;
  data: string;
  gasto: number;
  impressoes: number;
  alcance: number;
  frequencia: number | null;
  cliques: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  leads: number;
  conversas: number;
  conversoes: number;
  compras: number;
  custo_por_resultado: number | null;
  valor_conversao: number | null;
  created_at: string;
}

export interface AdsSyncLog {
  id: string;
  conta_id: string;
  iniciado_em: string;
  concluido_em: string | null;
  status: StatusSyncAds;
  erro: string | null;
  campanhas_sincronizadas: number;
}

export interface AttributionEvento {
  id: string;
  loja_id: string;
  cliente_id: string | null;
  card_id: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  campaign_id: string | null;
  adset: string | null;
  adset_id: string | null;
  ad: string | null;
  ad_id: string | null;
  keyword: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  criado_em: string;
}

export interface PerformanceDiagnostico {
  id: string;
  loja_id: string;
  campanha_id: string | null;
  tipo: TipoDiagnosticoPerformance;
  severidade: SeveridadeDiagnostico;
  mensagem: string;
  dados: Record<string, unknown>;
  status: "aberto" | "resolvido" | "ignorado";
  criado_em: string;
  resolvido_em: string | null;
}

export interface PerformanceDecisao {
  id: string;
  loja_id: string;
  campanha_id: string | null;
  agente: string;
  tipo_decisao: string;
  motivo: string;
  dados_utilizados: Record<string, unknown>;
  acao: string | null;
  resultado_esperado: string | null;
  resultado_posterior: string | null;
  status: StatusDecisaoPerformance;
  executado_por: string | null;
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  modo_autonomia_no_momento: string | null;
  criado_em: string;
}

// ============================================================================
// Fase 2 — Central de Inteligência + Creative Factory
// ============================================================================

export type StatusValidacaoCriativo = "ideia" | "referencia" | "hipotese" | "testando" | "validada" | "escalavel" | "saturada";
export type CategoriaHook =
  | "curiosidade" | "problema" | "comparacao" | "preco" | "urgencia" | "prova_social"
  | "autoridade" | "erro_comum" | "lista" | "transformacao" | "oportunidade" | "quebra_objecao";

export interface ReferenciaCriativa {
  id: string;
  loja_id: string;
  origem: string;
  url_origem: string | null;
  status: StatusValidacaoCriativo;
  hook: string | null;
  assunto: string | null;
  formato: string | null;
  duracao_segundos: number | null;
  estrutura: string | null;
  cta: string | null;
  oferta: string | null;
  emocao: string | null;
  publico: string | null;
  produto: string | null;
  argumento: string | null;
  prova: string | null;
  estilo_visual: string | null;
  texto_identificado: string | null;
  ritmo: string | null;
  enquadramento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HookBiblioteca {
  id: string;
  loja_id: string;
  categoria: CategoriaHook;
  texto: string;
  origem_referencia_id: string | null;
  quantidade_testes: number;
  resultados: Record<string, unknown>;
  produtos_utilizados: string[];
  taxa_sucesso: number | null;
  created_at: string;
  updated_at: string;
}

export interface OfertaBiblioteca {
  id: string;
  loja_id: string;
  nome: string;
  descricao: string | null;
  produto: string | null;
  margem_estimada: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  campanha_id: string | null;
  vendas_geradas: number;
  cac: number | null;
  lucro: number | null;
  created_at: string;
  updated_at: string;
}

export type StatusCreativeBrief = "rascunho" | "pronto" | "em_teste" | "arquivado";

export interface CreativeBrief {
  id: string;
  loja_id: string;
  objetivo: string;
  produto: string | null;
  publico: string | null;
  hipotese: string | null;
  hook_id: string | null;
  roteiro: string | null;
  copy: string | null;
  imagem_url: string | null;
  status: StatusCreativeBrief;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type StatusTesteLab = "planejado" | "rodando" | "dados_insuficientes" | "concluido";

export interface TestLabTeste {
  id: string;
  loja_id: string;
  brief_id: string | null;
  campanha_id: string | null;
  hipotese: string;
  variavel: string;
  controle: string;
  metrica_principal: string;
  metricas_secundarias: string[];
  duracao_minima_dias: number;
  amostra_minima: number;
  status: StatusTesteLab;
  iniciado_em: string | null;
  concluido_em: string | null;
  resultado: string | null;
  vencedor: boolean | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Fase 3 — Automação e Autonomia
// ============================================================================

export type ModoAutonomia = "observacao" | "recomendacao" | "controlado" | "autonomo";

export interface AutomationRegra {
  id: string;
  loja_id: string;
  nome: string;
  condicoes: { campo: string; operador: ">" | "<" | ">=" | "<=" | "=="; valor: number }[];
  acao: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface SimulacaoResultado {
  regra: string;
  periodoDias: number;
  campanhasAfetadas: { campanha_id: string; nome: string; gastoAtual: number; gastoSimulado: number; diferenca: number }[];
  observacao: string;
}

export interface DailyPerformanceReport {
  data: string;
  investimento: number;
  leads: number;
  vendas: number;
  faturamento: number;
  cac: number | null;
  roas: number | null;
  lucroAposAquisicao: number;
  funcionando: string[];
  atencao: string[];
  problemas: string[];
  acoesExecutadas: string[];
  testesAtivos: string[];
  proximasHipoteses: string[];
}

// ============================================================================
// Central de Oportunidades (Seção 41)
// ============================================================================

export type StatusOportunidade = "descoberta" | "analisando" | "aprovada" | "testando" | "validada" | "descartada";

export interface Oportunidade {
  id: string;
  loja_id: string;
  titulo: string;
  origem: string;
  evidencias: string | null;
  produto: string | null;
  publico: string | null;
  potencial: string | null;
  status: StatusOportunidade;
  campanha_relacionada_id: string | null;
  teste_id: string | null;
  resultado: string | null;
  created_at: string;
  updated_at: string;
}

/** Resumo agregado por período, usado no dashboard principal (Seção 1). */
export interface ResumoNeoPerformance {
  investimento: { hoje: number; semana: number; mes: number };
  limites: { diario: number | null; semanal: number | null; mensal: number | null };
  leads: number;
  conversas: number;
  vendas: number;
  faturamento: number;
  margem: number;
  cac: number | null;
  roas: number | null;
  lucroEstimado: number;
  taxaConversao: number | null;
  ticketMedio: number | null;
  comparacaoMesAnterior: { faturamento: number; vendas: number; investimento: number } | null;
}
