/**
 * Contrato único que TODO provedor de IA precisa cumprir — mesmo padrão
 * já usado pro WhatsApp (WhatsappProvider). O resto do sistema (Central
 * de Cotações, CRM, futuro atendimento) conversa só com isso, nunca
 * importa nada específico da OpenAI/Anthropic/Gemini diretamente.
 * Trocar de provedor na tela de Configurações muda esse comportamento
 * na hora, sem precisar alterar nenhuma linha de código.
 */
export interface AIProvider {
  /** Nome do provedor, pra log e exibição. */
  readonly nome: string;

  /**
   * Gera uma resposta de texto a partir de um prompt. Quem chama é
   * responsável por interpretar o texto retornado (ex: fazer JSON.parse
   * se pediu resposta estruturada no prompt do sistema) — a interface
   * fica genérica de propósito, porque o jeito de "forçar" JSON difere
   * um pouco entre provedores; cada implementação usa o melhor
   * mecanismo disponível do próprio provedor por baixo dos panos.
   */
  completar(input: AICompletarInput): Promise<AICompletarResultado>;
}

export interface AICompletarInput {
  /** A pergunta/tarefa em si. */
  prompt: string;
  /** Instrução de sistema — como a IA deve se comportar. Sobrescreve o prompt_sistema salvo em configuracoes_ia, se informado. */
  sistema?: string;
  /** 0 a 2 — menor é mais determinístico. Sobrescreve o valor salvo, se informado. */
  temperatura?: number;
  /** Sobrescreve o limite salvo, se informado. */
  maxTokens?: number;
  /** Pede explicitamente resposta em JSON — cada provedor usa seu mecanismo nativo pra forçar isso quando suportado. */
  formatoJson?: boolean;
}

export interface AICompletarResultado {
  texto: string;
  tokensEntrada?: number;
  tokensSaida?: number;
}
