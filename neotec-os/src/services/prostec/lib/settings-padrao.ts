/** Portado 1:1 do Neotec Prospector original — pesos/config padrão do motor de pontuação. */
export const SEGMENTOS_DISPONIVEIS = [
  "Restaurantes", "Clínicas", "Dentistas", "Advogados", "Contadores", "Imobiliárias",
  "Oficinas", "Auto centers", "Academias", "Salões de beleza", "Barbearias", "Lojas",
  "Construção", "Elétrica", "Refrigeração", "Empresas de serviços", "Hotéis", "Pousadas",
  "Escolas", "Cursos", "Transportadoras", "Indústrias", "Outros",
];

export const SEGMENTOS_ALTA_NECESSIDADE = [
  "Restaurantes", "Clínicas", "Dentistas", "Advogados", "Contadores", "Imobiliárias",
  "Academias", "Salões de beleza", "Barbearias", "Hotéis", "Pousadas", "Empresas de serviços",
];

export const CIDADES_SUGERIDAS = ["Araguari - MG", "Uberlândia - MG", "Patrocínio - MG", "Uberaba - MG", "Araxá - MG"];

/** Pipeline alinhado com a visão do documento: NOVO → CONTATADO →
 * QUALIFICADO → REUNIÃO → PROPOSTA → NEGOCIAÇÃO → FECHADO, com PERDIDO
 * (sempre com motivo) podendo acontecer em qualquer etapa. */
export const STATUS_DISPONIVEIS = [
  "novo", "contato_realizado", "qualificado", "reuniao",
  "proposta_enviada", "negociacao", "venda_fechada", "perdido",
];

export const STATUS_LABELS: Record<string, string> = {
  novo: "Novo", contato_realizado: "Contatado", qualificado: "Qualificado",
  reuniao: "Reunião", proposta_enviada: "Proposta enviada", negociacao: "Negociação",
  venda_fechada: "Fechado", perdido: "Perdido",
};

export interface ScoreWeights {
  sem_site: number; google_profile_ativo: number; muitas_avaliacoes: number;
  muitas_avaliacoes_threshold: number; instagram_ativo: number; telefone_whatsapp: number;
  operacao_estabelecida: number; segmento_alta_necessidade: number; presenca_fraca: number;
}

export const SCORE_WEIGHTS_PADRAO: ScoreWeights = {
  sem_site: 30, google_profile_ativo: 15, muitas_avaliacoes: 10, muitas_avaliacoes_threshold: 30,
  instagram_ativo: 10, telefone_whatsapp: 10, operacao_estabelecida: 10, segmento_alta_necessidade: 10, presenca_fraca: 5,
};
