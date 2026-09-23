/**
 * MOTOR ÚNICO DE AVALIAÇÃO DE TROCA (Fase 236).
 *
 * Regra fundamental do módulo: não existem "três cálculos diferentes"
 * (site, Neotec OS, bot) — todos chamam esta mesma função pura,
 * `avaliarTradeIn()`. Ela não acessa banco, não faz IO, não decide
 * regra de negócio além da fórmula em si — quem resolve modelo/config/
 * avarias no banco é a camada de aplicação (Fase 236 seguinte,
 * `aplicacao.service.ts`), que injeta os dados aqui já carregados.
 *
 * Se não existir modelo cadastrado, a camada de aplicação NUNCA chama
 * este motor "inventando" um valor — ela retorna a mensagem de
 * avaliação manual necessária antes mesmo de chegar aqui.
 */

export interface AvariaTradeIn {
  codigo: string;
  nome: string;
  /** Desconto em R$ configurado para ESTE modelo (troca_modelo_avarias.desconto). */
  desconto: number;
  /** Avaria que bloqueia o trade-in inteiro (troca_avarias.bloqueia) — ex: líquido, IMEI, iCloud. */
  bloqueia: boolean;
}

export interface ModeloTradeIn {
  id: string;
  nome: string;
  /** Valor BASE de troca — tabela própria (troca_modelos.valor_troca), nunca o preço de venda. */
  valorTroca: number;
  /** Avarias que este modelo aceita, com o desconto específico dele (sem linha = avaria não se aplica). */
  avariasDisponiveis: AvariaTradeIn[];
}

export interface ConfigTradeIn {
  /** Saúde de bateria (%) abaixo da qual a avaria "bateria" é marcada automaticamente. */
  bateriaCorte: number;
  /** Bônus aplicado quando o cliente troca por um seminovo do estoque. */
  bonusSeminovo: number;
}

export interface OpcoesAvaliacao {
  /** Códigos de avaria marcados manualmente (vindos do checklist — ver `avariasDoChecklist`). */
  avariasMarcadas: string[];
  /** Saúde de bateria em % (0-100), quando informada/medida. */
  bateriaSaude?: number | null;
  /** Permite a um checklist real (Neotec OS) informar um valor base diferente do cadastrado — uso raro, ex: promoção pontual já registrada fora da tabela. Padrão: usa `modelo.valorTroca`. */
  valorBaseManual?: number | null;
  /** Se o cliente está trocando por um seminovo do estoque (aplica `config.bonusSeminovo`). */
  aplicarBonusSeminovo?: boolean;
}

export interface ItemAjuste {
  codigo: string;
  nome: string;
  desconto: number;
}

export interface ResultadoAvaliacaoTradeIn {
  valorBase: number;
  ajustes: ItemAjuste[];
  totalDescontos: number;
  bonus: number;
  /** valorBase - totalDescontos + bonus, nunca negativo; 0 quando bloqueado. */
  valorFinal: number;
  bloqueado: boolean;
  /** Nomes das avarias que bloquearam (vazio quando não bloqueado). */
  motivos: string[];
  /** Trilha de auditoria: o que o motor considerou pra chegar no resultado (avarias automáticas incluídas). */
  regrasAplicadas: string[];
}

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Avalia uma troca. Pura — mesmo input sempre produz o mesmo output,
 * sem consultar banco. É isso que garante que site, Neotec OS e bot
 * calculem exatamente o mesmo valor pro mesmo aparelho.
 */
export function avaliarTradeIn(
  modelo: ModeloTradeIn,
  config: ConfigTradeIn,
  opcoes: OpcoesAvaliacao,
): ResultadoAvaliacaoTradeIn {
  const valorBase = opcoes.valorBaseManual ?? modelo.valorTroca;

  const regrasAplicadas: string[] = [];
  const codigosMarcados = new Set(opcoes.avariasMarcadas);

  // Bateria abaixo do corte configurado marca a avaria automaticamente,
  // mesmo que o checklist não tenha marcado "bateria" explicitamente
  // (cobre o caso do bot/site, que só tem o número de saúde, sem checklist completo).
  if (
    typeof opcoes.bateriaSaude === "number" &&
    opcoes.bateriaSaude < config.bateriaCorte &&
    !codigosMarcados.has("bateria")
  ) {
    codigosMarcados.add("bateria");
    regrasAplicadas.push(
      `Bateria ${opcoes.bateriaSaude}% abaixo do corte de ${config.bateriaCorte}% — avaria "bateria" marcada automaticamente.`,
    );
  }

  const ajustes: ItemAjuste[] = [];
  const motivos: string[] = [];
  let bloqueado = false;

  for (const avaria of modelo.avariasDisponiveis) {
    if (!codigosMarcados.has(avaria.codigo)) continue;

    if (avaria.bloqueia) {
      bloqueado = true;
      motivos.push(avaria.nome);
      regrasAplicadas.push(`Avaria "${avaria.nome}" bloqueia o trade-in.`);
      continue;
    }

    ajustes.push({ codigo: avaria.codigo, nome: avaria.nome, desconto: avaria.desconto });
    regrasAplicadas.push(`Avaria "${avaria.nome}": desconto de ${avaria.desconto}.`);
  }

  const totalDescontos = arredondar(ajustes.reduce((soma, item) => soma + item.desconto, 0));
  const bonus = opcoes.aplicarBonusSeminovo ? config.bonusSeminovo : 0;
  if (opcoes.aplicarBonusSeminovo && config.bonusSeminovo > 0) {
    regrasAplicadas.push(`Bônus por troca+seminovo: +${config.bonusSeminovo}.`);
  }

  const valorFinal = bloqueado ? 0 : arredondar(Math.max(0, valorBase - totalDescontos) + bonus);

  return {
    valorBase: arredondar(valorBase),
    ajustes,
    totalDescontos,
    bonus,
    valorFinal,
    bloqueado,
    motivos,
    regrasAplicadas,
  };
}
