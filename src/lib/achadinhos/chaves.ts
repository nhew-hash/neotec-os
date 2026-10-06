import { createHash, randomBytes } from "crypto";
import { ESCOPOS, type Escopo } from "./tipos";

/**
 * Chave de API do conector do Claude. A chave inteira só existe em texto
 * puro no momento da criação (quem criou copia e guarda); no banco fica só
 * o hash sha256. 32 bytes aleatórios = 256 bits de entropia, então o hash
 * simples (sem sal) é seguro — não há o que "adivinhar" por dicionário.
 */
export const PREFIXO_CHAVE = "ach_";

export function hashChave(chave: string): string {
  return createHash("sha256").update(chave).digest("hex");
}

export function gerarChaveApi(): { chave: string; prefixo: string; hash: string } {
  const chave = `${PREFIXO_CHAVE}${randomBytes(32).toString("base64url")}`;
  return { chave, prefixo: chave.slice(0, 12), hash: hashChave(chave) };
}

/** Extrai o token de `Authorization: Bearer <token>`. Devolve null se ausente/mal formado. */
export function extrairBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!m) return null;
  return m[1].startsWith(PREFIXO_CHAVE) ? m[1] : null;
}

export function escopoPermite(escopos: readonly Escopo[], necessario: Escopo): boolean {
  return escopos.includes(necessario);
}

export function normalizarEscopos(valores: readonly string[]): Escopo[] {
  return ESCOPOS.filter((e) => valores.includes(e));
}
