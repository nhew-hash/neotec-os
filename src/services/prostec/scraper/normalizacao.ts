import "server-only";

/**
 * Normalização dos dados brutos do scraper. Telefone segue o mesmo
 * padrão simples (baseado em dígitos) já usado no resto do projeto
 * (`src/utils/telefone.ts`), em vez de trazer uma lib nova só pra isso
 * — mas valida o formato BR de verdade (fixo/celular, com/sem 9º
 * dígito, com/sem DDI) antes de aceitar.
 */

const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 64, 63, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Retorna telefone em E.164 BR (+55DDNNNNNNNNN) ou null se não for um número BR válido. */
export function normalizarTelefoneE164BR(telefoneBruto: string | null): string | null {
  if (!telefoneBruto) return null;
  let digitos = telefoneBruto.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);

  // Fixo: DDD (2) + 8 dígitos = 10. Celular: DDD (2) + 9 dígitos = 11.
  if (digitos.length !== 10 && digitos.length !== 11) return null;

  const ddd = Number(digitos.slice(0, 2));
  if (!DDDS_VALIDOS.has(ddd)) return null;

  // Celular sempre começa com 9 depois do DDD (padrão nacional desde a
  // unificação do 9º dígito).
  if (digitos.length === 11 && digitos[2] !== "9") return null;

  return `+55${digitos}`;
}

export function normalizarSite(siteBruto: string | null): string | null {
  if (!siteBruto) return null;
  let url = siteBruto.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    parsed.protocol = "https:";
    // Remove UTM e afins — não é informação da empresa, é rastreio de
    // campanha de quem indexou o link originalmente.
    for (const chave of [...parsed.searchParams.keys()]) {
      if (chave.toLowerCase().startsWith("utm_") || chave.toLowerCase() === "fbclid" || chave.toLowerCase() === "gclid") {
        parsed.searchParams.delete(chave);
      }
    }
    let resultado = parsed.toString();
    if (resultado.endsWith("/") && parsed.pathname === "/") resultado = resultado.slice(0, -1);
    return resultado;
  } catch {
    return null;
  }
}

const DOMINIOS_EMAIL_INVALIDOS = ["example.com", "sentry.io", "wixpress.com", "godaddy.com", "domain.com", "yourdomain.com"];

export function normalizarEmails(emailsBrutos: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const bruto of emailsBrutos) {
    const email = bruto.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const dominio = email.split("@")[1];
    if (DOMINIOS_EMAIL_INVALIDOS.some((d) => dominio === d || dominio.endsWith(`.${d}`))) continue;
    if (email.startsWith("example@") || email.includes("@example.")) continue;
    if (vistos.has(email)) continue;
    vistos.add(email);
    resultado.push(email);
  }
  return resultado;
}

export function normalizarTexto(texto: string | null): string | null {
  if (!texto) return null;
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo || null;
}
