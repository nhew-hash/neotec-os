/**
 * Fase 254 — utilitário de fuso horário pra métricas de Analytics.
 *
 * Problema que isso resolve: `new Date().setHours(0,0,0,0)` usa o fuso
 * do SERVIDOR, não o do Brasil. Em produção (Vercel) o servidor roda em
 * UTC — então "início do dia" calculado assim marca meia-noite em UTC,
 * que é 21h da noite ANTERIOR em Araguari. Isso jogava até 3h de vendas
 * de um dia pro dia errado nos relatórios.
 *
 * O Brasil não observa mais horário de verão desde 2019 (Decreto
 * 9.772/2019), então America/Sao_Paulo é UTC-3 fixo o ano inteiro —
 * não precisa de biblioteca de fuso horário pra isso, só aritmética
 * simples baseada nesse offset fixo e conhecido.
 */

const OFFSET_HORAS_BRASILIA = 3; // America/Sao_Paulo = UTC-3, sem horário de verão desde 2019

/** Ano/mês/dia/hora correspondentes ao instante `data`, já no fuso de Brasília. */
export function obterDataHoraBrasilia(data: Date): { ano: number; mes: number; dia: number; hora: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hour12: false,
  }).formatToParts(data);

  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  // Intl formata meia-noite como "24" em alguns runtimes com hour12:false — normaliza pra 0.
  const horaBruta = valor("hour");

  return { ano: valor("year"), mes: valor("month"), dia: valor("day"), hora: horaBruta === 24 ? 0 : horaBruta };
}

/** Instante UTC correspondente à meia-noite de Brasília do dia em que `data` cai (fuso de Araguari, não do servidor). */
export function inicioDoDiaBrasilia(data: Date): Date {
  const { ano, mes, dia } = obterDataHoraBrasilia(data);
  // Meia-noite em Brasília = 03:00 UTC do mesmo dia (offset fixo -3, sem DST).
  return new Date(Date.UTC(ano, mes - 1, dia, OFFSET_HORAS_BRASILIA, 0, 0, 0));
}

/** Hora do dia (0–23) no fuso de Brasília — pra agrupar o gráfico "hoje" por hora local, não por hora do servidor. */
export function horaBrasilia(data: Date): number {
  return obterDataHoraBrasilia(data).hora;
}
