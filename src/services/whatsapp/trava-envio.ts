import { obterDataHoraBrasilia } from "@/utils/data-brasilia";

/**
 * TRAVA CENTRAL DE ENVIO AUTOMÁTICO (Fase A da auditoria, achado B-02/B-03).
 *
 * Funções puras — sem banco, sem relógio implícito — pra serem testáveis.
 * Quem envia mensagem automática (follow-up, resposta da IA) consulta isto
 * antes; humano mandando manualmente pela tela NÃO passa por aqui.
 *
 * Horários padrão (seg–sáb, 09h–19h de Brasília) são um PADRÃO TÉCNICO
 * provisório, sobrescrevível por env (`ENVIO_AUTO_HORA_INICIO`,
 * `ENVIO_AUTO_HORA_FIM`, `ENVIO_AUTO_DOMINGO`). O horário comercial real da
 * Neotec ainda precisa ser confirmado pelo dono.
 */

export interface JanelaEnvio {
  horaInicio: number; // inclusive
  horaFim: number; // exclusivo
  permiteDomingo: boolean;
}

export const JANELA_PADRAO: JanelaEnvio = { horaInicio: 9, horaFim: 19, permiteDomingo: false };

export function janelaDoAmbiente(env: Record<string, string | undefined> = process.env): JanelaEnvio {
  const num = (v: string | undefined, padrao: number) => {
    const n = v === undefined || v === "" ? NaN : Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 24 ? n : padrao;
  };
  return {
    horaInicio: num(env.ENVIO_AUTO_HORA_INICIO, JANELA_PADRAO.horaInicio),
    horaFim: num(env.ENVIO_AUTO_HORA_FIM, JANELA_PADRAO.horaFim),
    permiteDomingo: env.ENVIO_AUTO_DOMINGO === "1",
  };
}

/** Dia da semana (0=domingo) do instante, no fuso de Brasília. */
function diaDaSemanaBrasilia(data: Date): number {
  const { ano, mes, dia } = obterDataHoraBrasilia(data);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function dentroDaJanelaDeEnvio(agora: Date, janela: JanelaEnvio = JANELA_PADRAO): boolean {
  const { hora } = obterDataHoraBrasilia(agora);
  if (diaDaSemanaBrasilia(agora) === 0 && !janela.permiteDomingo) return false;
  return hora >= janela.horaInicio && hora < janela.horaFim;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Frases inequívocas de pedido de não contato. Conservador de propósito:
// "não quero" sozinho NÃO conta ("não quero o preto") — precisa de verbo de contato.
const PADROES_NAO_CONTATO: RegExp[] = [
  /\bpara de (me )?(mandar|enviar|chamar|ligar|insistir|incomodar)\b/,
  /\bnao (me )?(mande|manda|envie|chame|ligue|incomode|perturbe) (mais )?(mensagens?|nada|recados?)?/,
  /\bnao quero (mais )?(receber|ser contatad[oa]|mensagens?|contato|que (me )?(mande|chame|ligue))/,
  /\b(me )?(tire|tira|remova|remove|exclua|exclui) (meu numero )?(da|dessa|desta) (lista|base)\b/,
  /\bsair da lista\b/,
  /\bnao tenho interesse\b.*\b(parar|pare|mais|contato|mensagens?)\b/,
  /\b(descadastrar|descadastra|descadastre|cancelar (o )?recebimento)\b/,
  /\bnao (me )?(procure|procurem|contate|contatem)\b/,
  /\bdeixa(r)? de (me )?(mandar|enviar|chamar)\b/,
];

export function detectarPedidoNaoContato(texto: string | null | undefined): boolean {
  if (!texto) return false;
  const t = normalizar(texto);
  if (!t) return false;
  // "pare" / "stop" valem só como mensagem inteira ("pare", "pare por favor").
  if (/^(pare|parem|stop)( por favor| pfv| pf)?$/.test(t)) return true;
  return PADROES_NAO_CONTATO.some((re) => re.test(t));
}

export const INTERVALO_MINIMO_ENVIO_AUTO_HORAS = 24;

export type MotivoBloqueioEnvio = "nao_contatar" | "fora_do_horario" | "intervalo_minimo";

export interface EntradaTravaEnvio {
  agora: Date;
  naoContatar: boolean;
  /** Última mensagem AUTOMÁTICA enviada pra essa conversa (ISO), se houver. */
  ultimoEnvioAutomaticoEm?: string | null;
  janela?: JanelaEnvio;
  intervaloMinimoHoras?: number;
}

export function avaliarEnvioAutomatico(entrada: EntradaTravaEnvio): { permitido: true } | { permitido: false; motivo: MotivoBloqueioEnvio } {
  if (entrada.naoContatar) return { permitido: false, motivo: "nao_contatar" };
  if (!dentroDaJanelaDeEnvio(entrada.agora, entrada.janela)) return { permitido: false, motivo: "fora_do_horario" };
  const minimo = entrada.intervaloMinimoHoras ?? INTERVALO_MINIMO_ENVIO_AUTO_HORAS;
  if (entrada.ultimoEnvioAutomaticoEm) {
    const horas = (entrada.agora.getTime() - new Date(entrada.ultimoEnvioAutomaticoEm).getTime()) / 3_600_000;
    if (horas < minimo) return { permitido: false, motivo: "intervalo_minimo" };
  }
  return { permitido: true };
}
