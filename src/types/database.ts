/**
 * Tipos que espelham o schema Fase 1 do Neotec OS no Supabase.
 * Mantidos manualmente por enquanto — quando o projeto Supabase estiver
 * com a CLI configurada, o ideal é substituir este arquivo por tipos
 * gerados automaticamente (`supabase gen types typescript`), sem mudar
 * os nomes exportados abaixo para não quebrar os imports existentes.
 */

export type CargoUsuario = "admin" | "gerente" | "vendedor" | "tecnico" | "caixa";
export type StatusUsuario = "ativo" | "inativo";

export type OrigemCliente =
  | "instagram"
  | "google"
  | "indicacao"
  | "loja_fisica"
  | "shopify"
  | "outros";

export type NivelCliente = "normal" | "vip";

export type TemperaturaLead = "quente" | "morno" | "frio";

export type StatusAparelho =
  | "recebido"
  | "teste"
  | "aprovado"
  | "disponivel"
  | "reservado"
  | "vendido";

export type StatusOrcamento =
  | "criado"
  | "enviado"
  | "visualizado"
  | "aprovado"
  | "recusado"
  | "expirado";

export type StatusVenda = "concluida" | "cancelada" | "estornada";

export interface Usuario {
  id: string;
  loja_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: CargoUsuario;
  status: StatusUsuario;
  data_criacao: string;
  ultimo_acesso: string | null;
  updated_at: string;
}

export interface Cliente {
  id: string;
  loja_id: string;
  nome: string;
  whatsapp: string;
  cpf: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  apple_id: string | null;
  aceita_marketing: boolean;
  data_nascimento: string | null;
  observacoes: string | null;
  origem: OrigemCliente | null;
  nivel: NivelCliente;
  temperatura: TemperaturaLead;
  portal_user_id: string | null;
  senha_provisoria: boolean;
  data_cadastro: string;
  updated_at: string;
}

/**
 * Tabela real, existe desde a Fase 1 — usada na aba "Conversas" do
 * Cliente 360°. NÃO é a mesma coisa que WhatsappConversa (Fase 9, o
 * sistema de mensagens de verdade) nem que clientes.temperatura (Fase
 * 28, IA de Atendimento) — são três conceitos parecidos de nome, mas
 * genuinamente diferentes, em tabelas diferentes.
 */
export interface Conversa {
  id: string;
  loja_id: string;
  cliente_id: string;
  responsavel_id: string | null;
  canal: "whatsapp" | "outro";
  status: "aberta" | "resolvida" | "perdida";
  temperatura: TemperaturaLead;
  produto_interesse: string | null;
  data_inicio: string;
  updated_at: string;
}

export interface Loja {
  id: string;
  nome: string;
  endereco: string | null;
  ativo: boolean;
  created_at: string;
}

export type TipoEventoTimeline =
  | "venda"
  | "orcamento"
  | "ordem_servico"
  | "cashback"
  | "garantia"
  | "retorno"
  | "cliente_criado";

export interface TimelineEvento {
  id: string;
  loja_id: string;
  cliente_id: string;
  tipo_evento: TipoEventoTimeline;
  titulo: string;
  descricao: string | null;
  referencia_tabela: string;
  referencia_id: string;
  usuario_id: string | null;
  data: string;
}
export type TipoFoto = "aparelho" | "os" | "cliente";

export interface Foto {
  id: string;
  tipo: TipoFoto;
  referencia_id: string;
  url: string;
  data_upload: string;
}

export interface Retorno {
  id: string;
  cliente_id: string;
  usuario_id: string;
  data_retorno: string;
  motivo: string;
  observacao: string | null;
  status: "pendente" | "concluido" | "cancelado";
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  loja_id: string;
  categoria: "iphone" | "android" | "apple_watch" | "ipad" | "acessorio" | "peca";
  marca: string | null;
  modelo: string | null;
  nome: string;
  descricao: string | null;
  preco_venda: number | null;
  custo: number | null;
  estoque_minimo: number;
  status: "ativo" | "inativo";
  created_at: string;
  updated_at: string;
}

export type OrigemEntradaAparelho =
  | "fornecedor" | "cliente" | "troca" | "compra"
  | "consignacao" | "investidor" | "marketplace" | "leilao";

export interface Aparelho {
  id: string;
  loja_id: string;
  produto_id: string;
  imei: string;
  numero_serie: string | null;
  cor: string | null;
  memoria: string | null;
  bateria: number | null;
  condicao: "novo" | "seminovo" | "usado";
  custo: number;
  preco_venda: number | null;
  preco_minimo: number | null;
  preco_sugerido: number | null;
  fornecedor: string | null;
  origem_entrada: OrigemEntradaAparelho;
  investidor_id: string | null;
  consignacao_id: string | null;
  status: StatusAparelho;
  cliente_origem_id: string | null;
  data_entrada: string;
  updated_at: string;
}

export interface Venda {
  id: string;
  loja_id: string;
  cliente_id: string | null;
  usuario_id: string;
  orcamento_id: string | null;
  valor_total: number;
  desconto: number;
  lucro: number | null;
  forma_pagamento: string;
  status: StatusVenda;
  checklist_aparelho_conferido: boolean;
  checklist_acessorios_recebidos: boolean;
  checklist_garantia_entregue: boolean;
  checklist_cliente_confirmou: boolean;
  data_venda: string;
  updated_at: string;
}

export interface VendaItem {
  id: string;
  venda_id: string;
  produto_id: string | null;
  aparelho_id: string | null;
  quantidade: number;
  valor: number;
  custo: number;
}

export interface Orcamento {
  id: string;
  cliente_id: string;
  usuario_id: string;
  valor: number;
  forma_pagamento: string | null;
  garantia_dias: number | null;
  validade: string | null;
  status: StatusOrcamento;
  data_criacao: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  produto_id: string | null;
  aparelho_id: string | null;
  quantidade: number;
  valor: number;
}

export interface TesteAparelho {
  id: string;
  aparelho_id: string;
  face_id: boolean | null;
  camera: boolean | null;
  tela: boolean | null;
  som: boolean | null;
  microfone: boolean | null;
  wifi: boolean | null;
  bluetooth: boolean | null;
  carregamento: boolean | null;
  observacoes: string | null;
  responsavel_id: string | null;
  data_teste: string;
}

// ---- Fase 2: Assistência, Financeiro, Cashback, Garantias ----

export type StatusOS =
  | "recebido"
  | "diagnostico"
  | "orcamento"
  | "aguardando_aprovacao"
  | "em_reparo"
  | "teste"
  | "pronto"
  | "entregue";

export interface OrdemServico {
  id: string;
  loja_id: string;
  cliente_id: string;
  aparelho_id: string | null;
  aparelho_descricao: string | null;
  diagnostico_inicial: string | null;
  tecnico_id: string | null;
  numero_os: string;
  defeito: string;
  diagnostico: string | null;
  valor: number | null;
  status: StatusOS;
  garantia_dias: number | null;
  prazo: string | null;
  urgente: boolean;
  data_entrada: string;
  data_saida: string | null;
  updated_at: string;
}

export type TipoChecklistOS = "recebimento" | "entrega";

export interface ChecklistOS {
  id: string;
  os_id: string;
  tipo: TipoChecklistOS;
  liga: boolean | null;
  molhado: boolean | null;
  arranhado: boolean | null;
  tela: boolean | null;
  face_id: boolean | null;
  touch: boolean | null;
  botoes: boolean | null;
  cameras: boolean | null;
  biometria: boolean | null;
  senha_informada: boolean | null;
  senha_valor: string | null;
  senha_tipo: "numerica" | "desenho" | null;
  observacoes: string | null;
  responsavel_id: string | null;
  data_checklist: string;
}

export interface PecaOS {
  id: string;
  os_id: string;
  produto_id: string;
  quantidade: number;
  custo: number;
}

export type TipoFinanceiro = "entrada" | "saida";
export type OrigemFinanceiro = "venda" | "os" | "cashback" | "compra_fornecedor" | "despesa" | "outro";

export interface LancamentoFinanceiro {
  id: string;
  loja_id: string;
  tipo: TipoFinanceiro;
  categoria: string;
  valor: number;
  descricao: string | null;
  origem_tipo: OrigemFinanceiro;
  origem_id: string | null;
  usuario_id: string | null;
  data: string;
}

export type TipoCashback = "credito" | "debito";

export interface Cashback {
  id: string;
  cliente_id: string;
  tipo: TipoCashback;
  valor: number;
  origem: string | null;
  validade: string | null;
  data: string;
}

export type TipoGarantia = "produto" | "servico";

export interface Garantia {
  id: string;
  cliente_id: string;
  aparelho_id: string | null;
  venda_id: string | null;
  os_id: string | null;
  tipo: TipoGarantia;
  inicio: string;
  fim: string;
  observacao: string | null;
}

// ---- Fase 7: Investidores e Consignação ----

export type TipoMovimentoInvestidor = "aporte" | "saque";

export interface Investidor {
  id: string;
  loja_id: string;
  nome: string;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestidorMovimento {
  id: string;
  investidor_id: string;
  tipo: TipoMovimentoInvestidor;
  valor: number;
  observacao: string | null;
  usuario_id: string | null;
  data: string;
}

export interface InvestidorResumo {
  investidor_id: string;
  nome: string;
  capital_investido: number;
  total_sacado: number;
  capital_aplicado: number;
  lucro: number;
  capital_livre: number;
  rentabilidade_pct: number;
}

export type StatusConsignacao = "aguardando" | "vendido" | "devolvido";

export interface Consignacao {
  id: string;
  loja_id: string;
  cliente_id: string;
  aparelho_id: string | null;
  valor_combinado: number;
  prazo: string | null;
  status: StatusConsignacao;
  created_at: string;
  updated_at: string;
}

// ---- Fase 9: CRM configurável e Central de Comunicação ----

export interface CrmEtapa {
  id: string;
  loja_id: string;
  nome: string;
  ordem: number;
  cor: string;
  ativa: boolean;
  created_at: string;
}

export interface CrmTag {
  id: string;
  loja_id: string;
  nome: string;
  cor: string;
  created_at: string;
}

export type StatusRecuperacaoLead = "ativo" | "sem_retorno" | "recuperado";

export interface CrmCard {
  id: string;
  loja_id: string;
  cliente_id: string;
  etapa_id: string;
  titulo: string;
  valor_estimado: number | null;
  responsavel_id: string | null;
  origem: OrigemCliente | null;
  entrou_etapa_em: string;
  score: number;
  objecao: string | null;
  resumo_ia: string | null;
  proxima_acao: string | null;
  status_recuperacao: StatusRecuperacaoLead;
  sequencia_followup: number;
  ultima_resposta_cliente_em: string | null;
  perdido: boolean;
  motivo_perda: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmScoreEvento {
  id: string;
  card_id: string;
  motivo: string;
  pontos: number;
  created_at: string;
}

export type StatusFollowup = "pendente" | "concluido" | "cancelado";

export interface CrmFollowup {
  id: string;
  card_id: string;
  usuario_id: string | null;
  data_agendada: string;
  motivo: string;
  status: StatusFollowup;
  created_at: string;
}

export type StatusConversaWhatsapp = "aberta" | "aguardando_cliente" | "resolvida" | "perdida";
export type DirecaoMensagem = "entrada" | "saida";
export type TipoMensagemWhatsapp = "texto" | "imagem" | "documento" | "audio" | "template";
export type StatusEntregaMensagem = "enviando" | "enviado" | "entregue" | "lido" | "erro";
export type StatusAprovacaoTemplate = "rascunho" | "em_analise" | "aprovado" | "rejeitado";

export interface WhatsappConversa {
  id: string;
  loja_id: string;
  cliente_id: string | null;
  card_id: string | null;
  telefone: string;
  jid_envio: string | null;
  ia_pausada: boolean;
  status: StatusConversaWhatsapp;
  responsavel_id: string | null;
  nao_lidas: number;
  ultima_mensagem_em: string | null;
  primeira_resposta_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappMensagem {
  id: string;
  conversa_id: string;
  direcao: DirecaoMensagem;
  tipo: TipoMensagemWhatsapp;
  conteudo: string | null;
  url_midia: string | null;
  template_id: string | null;
  status_entrega: StatusEntregaMensagem;
  whatsapp_message_id: string | null;
  enviado_por: string | null;
  enviado_por_ia: boolean;
  lida_em: string | null;
  criado_em: string;
}

export interface WhatsappTemplate {
  id: string;
  loja_id: string;
  nome: string;
  categoria: string;
  idioma: string;
  corpo: string;
  variaveis: string[];
  status_aprovacao: StatusAprovacaoTemplate;
  meta_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappLog {
  id: string;
  loja_id: string;
  direcao: DirecaoMensagem;
  evento: string;
  payload: Record<string, unknown>;
  sucesso: boolean;
  erro: string | null;
  criado_em: string;
}

// ---- Fase 22: Multi-provider WhatsApp ----

export type WhatsappProviderTipo = "meta_cloud" | "whatsapp_web";
export type StatusConexaoWhatsapp = "desconectado" | "conectando" | "aguardando_qr" | "conectado" | "erro";

export interface IntegracaoWhatsapp {
  id: string;
  loja_id: string;
  provider: WhatsappProviderTipo;
  status: StatusConexaoWhatsapp;
  numero: string | null;
  session_id: string | null;
  qr_code: string | null;
  mensagens_hoje: number;
  ultima_conexao: string | null;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Fase 26: Infraestrutura central de IA ----

export type IAProviderTipo = "openai" | "anthropic" | "gemini" | "local";

export interface ConfiguracaoIA {
  id: string;
  loja_id: string;
  provider: IAProviderTipo;
  modelo: string;
  ativo: boolean;
  atendimento_automatico_ativo: boolean;
  temperatura: number;
  limite_tokens: number;
  prompt_sistema: string | null;
  created_at: string;
  updated_at: string;
}

export interface IALog {
  id: string;
  loja_id: string;
  modulo: string;
  provider: IAProviderTipo;
  modelo: string;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  custo_estimado_usd: number | null;
  duracao_ms: number | null;
  sucesso: boolean;
  erro: string | null;
  cache_hit: boolean;
  created_at: string;
}

// ---- Fase 27: Central de Cotações Inteligente ----

export type StatusCotacao = "ativa" | "arquivada";

export interface Cotacao {
  id: string;
  loja_id: string;
  fornecedor: string;
  categoria: string;
  data_cotacao: string;
  status: StatusCotacao;
  observacao: string | null;
  texto_original: string;
  quantidade_aparelhos: number;
  usuario_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CotacaoItem {
  id: string;
  cotacao_id: string;
  tipo_produto: string;
  modelo: string;
  armazenamento: string | null;
  cor: string | null;
  bateria_percentual: number | null;
  preco: number;
  quantidade: number;
  garantia: string | null;
  observacao: string | null;
  created_at: string;
}

export interface MapeamentoEmojiCor {
  id: string;
  loja_id: string;
  emoji: string;
  cor: string;
  created_at: string;
}

export interface PrioridadeBuscaPreco {
  id: string;
  loja_id: string;
  ordem: string[];
  created_at: string;
  updated_at: string;
}