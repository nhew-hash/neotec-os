import { dentroDaJanelaDeEnvio, proximoHorarioPermitido, JANELA_PADRAO, type JanelaEnvio } from "@/services/whatsapp/trava-envio";
import { obterDataHoraBrasilia } from "@/utils/data-brasilia";

/**
 * Motor de SUGESTÕES COMERCIAIS (Fase C). Puro e determinístico: recebe o contexto
 * já carregado da conversa e devolve, no máximo, UMA sugestão. Não envia nada,
 * não promete preço nem desconto, não consulta banco. A vendedora decide.
 */

export type TipoSugestao =
  | "cliente_aguardando" | "pediu_preco" | "cliente_parou" | "objecao_preco" | "objecao_parcelamento"
  | "objecao_concorrencia" | "objecao_confianca" | "objecao_troca" | "retomar_depois" | "perto_de_fechar"
  | "precisa_gerente" | "sem_responsavel";

export interface MensagemResumo {
  direcao: "entrada" | "saida";
  conteudo: string | null;
  criadoEm: string; // ISO
}

export interface SugestaoAnterior {
  tipo: string;
  status: "sugerida" | "enviada" | "adiada" | "descartada" | "vencida";
  criadoEm: string;
  adiadaAte?: string | null;
}

export interface ContextoConversa {
  conversaId: string;
  cardId: string | null;
  clienteId: string | null;
  responsavelId: string | null;
  clienteNome: string | null;
  naoContatar: boolean;
  iaPausada: boolean;
  cardPerdido?: boolean;
  temperatura?: string | null;
  mensagens: MensagemResumo[]; // qualquer ordem
  sugestoesAnteriores: SugestaoAnterior[];
}

export interface SugestaoGerada {
  conversaId: string;
  cardId: string | null;
  clienteId: string | null;
  responsavelId: string | null;
  tipo: TipoSugestao;
  motivo: string;
  mensagemSugerida: string | null;
  prioridade: 1 | 2 | 3;
  horarioRecomendado: Date;
  chaveDedupe: string;
}

const HORA = 3_600_000;

function norm(t: string | null | undefined): string {
  return (t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

export function classificarObjecao(texto: string | null | undefined): TipoSugestao | null {
  const t = norm(texto);
  if (!t) return null;
  if (/\b(golpe|confiavel|confianca|e seguro|tem garantia mesmo|e original|nota fiscal)\b/.test(t)) return "objecao_confianca";
  if (/\b(outra loja|la na|concorrente|mais barato em|achei mais barato|vi mais barato|no mercado livre|na shopee|no paraguai)\b/.test(t)) return "objecao_concorrencia";
  if (/\b(parcel|entrada|sem juros|12x|10x|em quantas vezes|no boleto|carne)\b/.test(t)) return "objecao_parcelamento";
  if (/\b(caro|muito alto|pesado|desconto|abaixa|abater|faz por quanto|menos|ultimo preco|melhor preco)\b/.test(t)) return "objecao_preco";
  if (/\b(troca|trocar|dar o meu|meu aparelho|usado na troca|aceita o meu)\b/.test(t)) return "objecao_troca";
  return null;
}

export function pediuPreco(texto: string | null | undefined): boolean {
  return /\b(preco|valor|quanto (custa|esta|fica|sai)|quanto e|orcamento|cotacao)\b/.test(norm(texto));
}

function pertoDeFechar(texto: string | null | undefined): boolean {
  return /\b(vou (buscar|passar|ai|ir ai)|pode (separar|reservar)|separa (pra|para) mim|reserva|fechado|fechou|vou levar|quero comprar|como (eu )?pago|manda o pix|chave pix)\b/.test(norm(texto));
}

/** Interpreta "amanhã", "mais tarde", "semana que vem"... e devolve o instante (Brasília) em que faz sentido retomar. */
export function interpretarRetomada(texto: string | null | undefined, agora: Date, janela: JanelaEnvio = JANELA_PADRAO): Date | null {
  const t = norm(texto);
  if (!t) return null;
  const { ano, mes, dia } = obterDataHoraBrasilia(agora);
  const aoMeioDia = (diasMais: number, hora: number) => new Date(Date.UTC(ano, mes - 1, dia + diasMais, hora + 3, 0, 0)); // Brasília = UTC-3
  let alvo: Date | null = null;
  if (/\b(semana que vem|proxima semana|daqui (uma|1) semana)\b/.test(t)) alvo = aoMeioDia(7, 10);
  else if (/\bamanha\b/.test(t)) alvo = aoMeioDia(1, 10);
  else if (/\b(mais tarde|a tarde|daqui a pouco|depois do almoco|mais pra noite)\b/.test(t)) {
    const { hora } = obterDataHoraBrasilia(agora);
    alvo = hora < 15 ? aoMeioDia(0, 16) : aoMeioDia(1, 10);
  } else if (/\b(depois eu (falo|te chamo|vejo|retorno)|te aviso|vou pensar|deixa eu ver|preciso ver)\b/.test(t)) alvo = aoMeioDia(2, 10);
  if (!alvo) return null;
  return proximoHorarioPermitido(alvo, janela);
}

function primeiroNome(nome: string | null): string {
  const n = (nome ?? "").trim().split(/\s+/)[0];
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "tudo bem";
}

const RASCUNHOS: Record<TipoSugestao, (nome: string) => string | null> = {
  cliente_aguardando: (n) => `Oi ${n}! Desculpa a demora, já vi sua mensagem. Pode me contar o que você precisa que eu te ajudo agora 😊`,
  pediu_preco: (n) => `Oi ${n}! Vou te passar os valores e as condições direitinho. Qual modelo e armazenamento você tem em mente?`,
  cliente_parou: (n) => `Oi ${n}, tudo bem? Passando para saber se ainda tem interesse. Se quiser, te ajudo a escolher a melhor opção 😊`,
  objecao_preco: (n) => `${n}, entendo! Vou ver com a gerente a melhor condição possível para você e já te retorno.`,
  objecao_parcelamento: (n) => `${n}, consigo te mostrar as opções de parcelamento e entrada. Quer que eu simule para você?`,
  objecao_concorrencia: (n) => `${n}, obrigada por contar! Se me passar o que viu, comparo com você incluindo garantia e procedência. Posso confirmar a melhor condição com a gerente.`,
  objecao_confianca: (n) => `${n}, a Neotec fica em Araguari, com loja física, nota fiscal e garantia. Se quiser, te mando o endereço e você vê o aparelho pessoalmente 😊`,
  objecao_troca: (n) => `${n}, aceitamos seu aparelho na troca. Me diga o modelo, a capacidade e a saúde da bateria que eu faço uma avaliação inicial.`,
  retomar_depois: (n) => `Oi ${n}! Combinamos de conversar hoje. Conseguiu ver? Fico à disposição 😊`,
  perto_de_fechar: (n) => `${n}, ótimo! Posso separar o aparelho para você. Qual forma de pagamento prefere?`,
  precisa_gerente: () => null,
  sem_responsavel: () => null,
};

function ultimo(msgs: MensagemResumo[], direcao: "entrada" | "saida"): MensagemResumo | null {
  return msgs.filter((m) => m.direcao === direcao).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0] ?? null;
}

function montar(ctx: ContextoConversa, tipo: TipoSugestao, motivo: string, prioridade: 1 | 2 | 3, quando: Date, referencia: string, agora: Date, janela: JanelaEnvio): SugestaoGerada {
  const horario = proximoHorarioPermitido(quando.getTime() < agora.getTime() ? agora : quando, janela);
  return {
    conversaId: ctx.conversaId, cardId: ctx.cardId, clienteId: ctx.clienteId, responsavelId: ctx.responsavelId,
    tipo, motivo, mensagemSugerida: RASCUNHOS[tipo](primeiroNome(ctx.clienteNome)), prioridade, horarioRecomendado: horario,
    chaveDedupe: `${ctx.conversaId}:${tipo}:${referencia}`,
  };
}

export const MAX_ENVIOS_SEM_RESPOSTA = 2;

/** No máximo UMA sugestão por conversa, a de maior prioridade. `null` = nada a sugerir. */
export function gerarSugestao(ctx: ContextoConversa, agora: Date, janela: JanelaEnvio = JANELA_PADRAO): SugestaoGerada | null {
  if (ctx.naoContatar || ctx.cardPerdido) return null;
  if (ctx.mensagens.length === 0) return null;

  // Já existe sugestão em aberto (sugerida, ou adiada que ainda não venceu): não empilha.
  const emAberto = ctx.sugestoesAnteriores.some((s) =>
    s.status === "sugerida" || (s.status === "adiada" && s.adiadaAte && new Date(s.adiadaAte).getTime() > agora.getTime()));
  if (emAberto) return null;

  const entrada = ultimo(ctx.mensagens, "entrada");
  const saida = ultimo(ctx.mensagens, "saida");
  const ultimaQualquer = ultimo(ctx.mensagens, entrada && saida ? (entrada.criadoEm > saida.criadoEm ? "entrada" : "saida") : entrada ? "entrada" : "saida")!;

  // Limite de insistência: 2 envios guiados nos últimos 14 dias sem nenhuma resposta do cliente depois do primeiro.
  const quatorzeDias = agora.getTime() - 14 * 24 * HORA;
  const enviadas = ctx.sugestoesAnteriores.filter((s) => s.status === "enviada" && new Date(s.criadoEm).getTime() >= quatorzeDias);
  if (enviadas.length >= MAX_ENVIOS_SEM_RESPOSTA) {
    const primeira = enviadas.map((s) => s.criadoEm).sort()[0];
    if (!entrada || entrada.criadoEm < primeira) return null;
  }
  // Intervalo mínimo de 24 h entre sugestões já enviadas.
  if (ctx.sugestoesAnteriores.some((s) => s.status === "enviada" && agora.getTime() - new Date(s.criadoEm).getTime() < 24 * HORA)) return null;

  const idadeEntrada = entrada ? agora.getTime() - new Date(entrada.criadoEm).getTime() : Infinity;
  const clienteFoiOUltimo = !!entrada && (!saida || entrada.criadoEm > saida.criadoEm);

  if (clienteFoiOUltimo && entrada) {
    // 1) Negociação perto de fechar — prioridade máxima, e a gerente precisa saber.
    if (pertoDeFechar(entrada.conteudo) && idadeEntrada <= 24 * HORA) {
      return montar(ctx, "perto_de_fechar", "Cliente sinalizou que vai fechar (pediu para separar/reservar/pagar). Responder já.", 1, agora, entrada.criadoEm, agora, janela);
    }
    // 2) Pediu para falar depois: agenda o retorno, em vez de responder agora.
    const retomada = interpretarRetomada(entrada.conteudo, new Date(entrada.criadoEm), janela);
    if (retomada) {
      if (retomada.getTime() > agora.getTime() + 15 * 60_000) {
        return montar(ctx, "retomar_depois", `Cliente pediu para conversar depois ("${(entrada.conteudo ?? "").slice(0, 60)}"). Retornar no horário combinado.`, 2, retomada, entrada.criadoEm, agora, janela);
      }
      return montar(ctx, "retomar_depois", "O horário que o cliente pediu para retomar já chegou.", 1, agora, entrada.criadoEm, agora, janela);
    }
    // 3) Objeção (preço, parcelamento, concorrência, confiança, troca).
    const objecao = classificarObjecao(entrada.conteudo);
    if (objecao && idadeEntrada >= 15 * 60_000 && idadeEntrada <= 5 * 24 * HORA) {
      const ehPreco = objecao === "objecao_preco" || objecao === "objecao_concorrencia";
      return montar(ctx, objecao, `Objeção do cliente: ${objecao.replace("objecao_", "")}.${ehPreco ? " Qualquer condição especial precisa passar pela gerente." : ""}`, ehPreco ? 1 : 2, agora, entrada.criadoEm, agora, janela);
    }
    // 4) Pediu preço / está esperando resposta.
    const limite = ctx.iaPausada ? 15 * 60_000 : HORA; // IA ativa tem uma hora para responder antes de virar pendência
    if (idadeEntrada >= limite && idadeEntrada <= 7 * 24 * HORA) {
      if (pediuPreco(entrada.conteudo)) {
        return montar(ctx, "pediu_preco", "Cliente pediu preço/orçamento e ainda não teve retorno.", 1, agora, entrada.criadoEm, agora, janela);
      }
      return montar(ctx, "cliente_aguardando", "Cliente enviou mensagem e está sem retorno.", 2, agora, entrada.criadoEm, agora, janela);
    }
    return null;
  }

  // Último a falar foi a loja: o cliente esfriou?
  if (saida && entrada && agora.getTime() - new Date(saida.criadoEm).getTime() >= 24 * HORA && agora.getTime() - new Date(saida.criadoEm).getTime() <= 14 * 24 * HORA) {
    return montar(ctx, "cliente_parou", "Cliente demonstrou interesse e parou de responder depois da nossa última mensagem.", ctx.temperatura === "quente" ? 1 : 3, agora, saida.criadoEm, agora, janela);
  }

  // Conversa com cliente ativo e ninguém responsável.
  if (!ctx.responsavelId && entrada && idadeEntrada <= 3 * 24 * HORA) {
    return montar(ctx, "sem_responsavel", "Conversa recente sem responsável definido.", 3, agora, ultimaQualquer.criadoEm, agora, janela);
  }
  return null;
}

/** Decide o resultado de uma sugestão ENVIADA olhando o que aconteceu depois (usado pelo cron, após 48 h). */
export function resultadoDoAcompanhamento(enviadaEm: string, mensagens: MensagemResumo[], agora: Date): "respondeu" | "sem_resposta" | null {
  const respondeu = mensagens.some((m) => m.direcao === "entrada" && m.criadoEm > enviadaEm);
  if (respondeu) return "respondeu";
  return agora.getTime() - new Date(enviadaEm).getTime() >= 48 * HORA ? "sem_resposta" : null;
}

export { dentroDaJanelaDeEnvio };
