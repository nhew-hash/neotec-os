/**
 * Utilitários de formatação (não confundir com lib/utils.ts, que é
 * exclusivo do helper `cn()` do shadcn/ui).
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Fase 257 — inverso de `formatCurrency`: aceita o que a pessoa digitar
 * pra editar um preço ("R$ 1.890,00", "1.890,00", "1890.90", "999,9")
 * e devolve número ou `null` se não der pra interpretar com confiança.
 * Nunca arredonda/adivinha separador decimal errado — se o formato for
 * ambíguo demais, prefere `null` (rejeitar) a inventar um valor.
 */
export function parseCurrencyBRL(input: string): number | null {
  const limpo = input.replace(/[^\d.,-]/g, "").trim();
  if (!limpo) return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");
  let normalizado: string;

  if (temVirgula && temPonto) {
    // "1.890,00" — ponto é separador de milhar, vírgula é decimal.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    // "999,90" — vírgula é decimal.
    normalizado = limpo.replace(",", ".");
  } else {
    // "1890.90" ou "1890" — já em formato numérico (ponto decimal ou inteiro).
    normalizado = limpo;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return numero;
}

/**
 * Fuso fixo de exibição. Sem isto, a mesma data saía diferente no servidor
 * (UTC na Vercel: horários 3h adiantados em Server Components) e no
 * navegador — e o Client Component dava erro de hidratação.
 */
export const FUSO_EXIBICAO = "America/Sao_Paulo";

/** "2026-10-15" (coluna `date`) é data civil: não pode mudar de dia por causa de fuso. */
const DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(value: string | Date): string {
  const civil = typeof value === "string" && DATA_CIVIL.test(value);
  const date = typeof value === "string" ? new Date(civil ? `${value}T12:00:00Z` : value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: civil ? "UTC" : FUSO_EXIBICAO,
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_EXIBICAO,
  }).format(date);
}

export function formatWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return value;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Saudação por horário — usa o fuso de Araguari (America/Sao_Paulo)
 * explicitamente, não o horário do servidor (a Vercel roda em Washington,
 * fuso diferente do Brasil — calcular sem isso dava saudação errada).
 */
export function getSaudacao(): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date())
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** "Hoje" / "Ontem" / data por extenso — usado nos separadores de dia do chat. */
/** Dia civil (YYYY-MM-DD) de um instante, no fuso de exibição. */
function diaCivil(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_EXIBICAO, year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
}

export function formatDiaRelativo(dataIso: string, agora: Date = new Date()): string {
  const data = new Date(dataIso);
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  if (diaCivil(data) === diaCivil(agora)) return "Hoje";
  if (diaCivil(data) === diaCivil(ontem)) return "Ontem";
  const mesmoAno = diaCivil(data).slice(0, 4) === diaCivil(agora).slice(0, 4);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: mesmoAno ? undefined : "numeric", timeZone: FUSO_EXIBICAO });
}

/** Horário compacto para listas: "14:32" hoje, "Ontem", "seg." nesta semana, "03/10" antes. */
export function formatHorarioCurto(dataIso: string, agora: Date = new Date()): string {
  const data = new Date(dataIso);
  const dias = (new Date(`${diaCivil(agora)}T12:00:00Z`).getTime() - new Date(`${diaCivil(data)}T12:00:00Z`).getTime()) / 86400000;
  if (dias <= 0) return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_EXIBICAO }).format(data);
  if (dias === 1) return "Ontem";
  if (dias < 7) return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: FUSO_EXIBICAO }).format(data);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO_EXIBICAO }).format(data);
}

/** Só a hora ("14:32"), para bolhas de mensagem. */
export function formatHora(dataIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_EXIBICAO }).format(new Date(dataIso));
}
