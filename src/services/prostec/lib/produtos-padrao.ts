/**
 * Catálogo de produtos da Prostec — Fase 223.
 *
 * Até aqui a Iara só sabia vender "site institucional" (era literalmente
 * a única coisa configurada em prostec_oferta). Na prática a Neotec
 * vende bem mais que isso pro mesmo público (empresa local sem presença
 * digital decente): catálogo digital, robô de automação de atendimento,
 * CRM e página de link-na-bio. Esse arquivo é a fonte única dos dados
 * PADRÃO de cada produto — usada tanto pra semear a tabela
 * `prostec_produtos` na migração quanto como fallback em código (mesmo
 * padrão já usado em settings-padrao.ts) se a tabela ainda estiver
 * vazia por algum motivo.
 *
 * "quando_recomendar" existe especificamente pra Iara: é o critério que
 * ela usa pra saber qual produto empurrar pra cada lead, em vez de
 * empurrar sempre o mesmo "site" pra todo mundo.
 */

export interface ProdutoProstecDados {
  id: string; // slug estável — nunca mudar depois de criado (referenciado em leads/propostas)
  nome: string;
  descricao_curta: string;
  quando_recomendar: string;
  /**
   * Quando tipo_cobranca = "unico": é o preço total do produto.
   * Quando tipo_cobranca = "mensal": é a TAXA DE INTEGRAÇÃO — cobrança
   * única de implantação/configuração, cobrada uma vez só no início.
   * Depois disso passa a valer valor_manutencao_mensal (Fase 225 —
   * antes existia só um valor mensal fixo, sem separar setup de
   * manutenção; robô de automação e CRM têm custo real de implantação
   * que não é justo diluir só na mensalidade).
   */
  preco: number;
  tipo_cobranca: "unico" | "mensal";
  /** Só usado quando tipo_cobranca = "mensal" — valor cobrado por mês, a partir do 2º mês, como manutenção. 0 quando o produto é de pagamento único. */
  valor_manutencao_mensal: number;
  formas_pagamento: string;
  prazo_entrega: string;
  incluso: string;
  nao_incluso: string;
  desconto_maximo_automatico_pct: number;
  parcelamento_maximo: number;
  ativo: boolean;
  ordem: number;
}

export const PRODUTOS_PROSTEC_PADRAO: ProdutoProstecDados[] = [
  {
    id: "site",
    nome: "Site institucional profissional",
    descricao_curta: "Site próprio, com domínio, otimizado pra celular e feito pra aparecer no Google.",
    quando_recomendar: "Empresa não tem site nenhum (site_analysis.possui_site = false) — é sempre a primeira sugestão pra quem só tem rede social ou nem isso.",
    preco: 1497,
    tipo_cobranca: "unico",
    valor_manutencao_mensal: 0,
    formas_pagamento: "PIX ou cartão de crédito, em até 12x",
    prazo_entrega: "10 dias úteis após aprovação do conteúdo",
    incluso: "Design profissional, até 5 páginas, formulário de contato, otimização para celular",
    nao_incluso: "Fotos profissionais, redação de texto, domínio e hospedagem (orientamos como contratar)",
    desconto_maximo_automatico_pct: 0,
    parcelamento_maximo: 12,
    ativo: true,
    ordem: 1,
  },
  {
    id: "catalogo_digital",
    nome: "Catálogo digital",
    descricao_curta: "Catálogo online dos produtos/serviços com fotos e preços, pra mandar o link no WhatsApp em vez de ficar tirando foto e digitando preço um por um.",
    quando_recomendar: "Empresa vende produto físico/serviço com variedade (loja, oficina, salão, restaurante) e hoje manda catálogo por foto solta no WhatsApp ou Instagram — dor comum de quem tem volume de produto mas nenhuma organização digital.",
    preco: 697,
    tipo_cobranca: "unico",
    valor_manutencao_mensal: 0,
    formas_pagamento: "PIX ou cartão de crédito, em até 6x",
    prazo_entrega: "5 dias úteis após receber a lista de produtos/preços",
    incluso: "Catálogo online com fotos, preços e categorias, link único pra compartilhar, atualização inclusa no primeiro mês",
    nao_incluso: "Fotos profissionais dos produtos, integração com carrinho de compra/pagamento online",
    desconto_maximo_automatico_pct: 0,
    parcelamento_maximo: 6,
    ativo: true,
    ordem: 2,
  },
  {
    id: "robo_chat",
    nome: "Robô de automação de atendimento (WhatsApp)",
    descricao_curta: "Assistente automático no WhatsApp que responde as perguntas repetidas (horário, endereço, preço, disponibilidade) e já filtra quem tá pronto pra falar com um humano.",
    quando_recomendar: "Empresa recebe bastante mensagem repetida no WhatsApp/Instagram (clínica, oficina, restaurante com delivery, escola) e o dono/atendente perde tempo respondendo sempre a mesma coisa — segmento com alto volume de contato é o ideal.",
    preco: 697,
    tipo_cobranca: "mensal",
    valor_manutencao_mensal: 197,
    formas_pagamento: "Taxa de integração via PIX ou cartão; manutenção mensal em assinatura recorrente (PIX ou cartão)",
    prazo_entrega: "7 dias úteis pra configurar os fluxos e testar com a empresa",
    incluso: "Configuração dos fluxos de resposta pro negócio, horário de funcionamento, transferência pra humano quando necessário, relatório mensal de conversas — manutenção mensal inclui ajustes e suporte contínuo",
    nao_incluso: "Integração com sistemas internos da empresa (ERP próprio, agenda de terceiros) — sob consulta",
    desconto_maximo_automatico_pct: 0,
    parcelamento_maximo: 1,
    ativo: true,
    ordem: 3,
  },
  {
    id: "crm",
    nome: "CRM de vendas",
    descricao_curta: "Sistema simples pra organizar cliente, negociação e follow-up — pra parar de perder venda porque esqueceu de retornar alguém.",
    quando_recomendar: "Empresa já vende bem e tem equipe de atendimento/vendas, mas controla cliente em caderno, planilha solta ou na memória — segmento consultivo com ciclo de venda mais longo (imobiliária, contador, advogado, oficina, prestador de serviço B2B).",
    preco: 497,
    tipo_cobranca: "mensal",
    valor_manutencao_mensal: 97,
    formas_pagamento: "Taxa de integração via PIX ou cartão; manutenção mensal em assinatura recorrente (PIX ou cartão)",
    prazo_entrega: "5 dias úteis pra configurar e treinar a equipe",
    incluso: "Implantação com cadastro de clientes/negociações, funil de vendas, lembretes de follow-up, até 3 usuários — manutenção mensal inclui suporte e ajustes contínuos",
    nao_incluso: "Usuários extras além de 3 (cobrado à parte), integração com ERP externo",
    desconto_maximo_automatico_pct: 0,
    parcelamento_maximo: 1,
    ativo: true,
    ordem: 4,
  },
  {
    id: "link_bio",
    nome: "Página de link na bio",
    descricao_curta: "Aquela página única de link (tipo Linktree) com a cara da empresa, pra colocar no lugar do link genérico na bio do Instagram — reúne WhatsApp, catálogo, endereço e redes num só lugar.",
    quando_recomendar: "Empresa é ativa no Instagram (tem perfil, posta com frequência) mas não tem site nem página própria de link — solução de entrada mais barata pra quem hoje só usa o Instagram como \"site\".",
    preco: 297,
    tipo_cobranca: "unico",
    valor_manutencao_mensal: 0,
    formas_pagamento: "PIX ou cartão de crédito, em até 3x",
    prazo_entrega: "3 dias úteis após aprovação do conteúdo",
    incluso: "Página com a identidade visual da empresa, botões pra WhatsApp/Instagram/catálogo/endereço, domínio próprio opcional",
    nao_incluso: "Design de logo do zero, fotos profissionais",
    desconto_maximo_automatico_pct: 0,
    parcelamento_maximo: 3,
    ativo: true,
    ordem: 5,
  },
];
