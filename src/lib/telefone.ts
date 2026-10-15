/**
 * Telefone brasileiro: o sistema guarda `clientes.whatsapp` só com dígitos (DDD + número, 10 ou 11).
 * Estas funções são puras e servem à busca (digitado de qualquer jeito) e ao cadastro (normalizado).
 */
export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Tira o código do país (55) quando vier colado, mas só se sobrar um número com DDD plausível. */
export function removerCodigoPais(digitos: string): string {
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) return digitos.slice(2);
  return digitos;
}

export function normalizarTelefone(texto: string): string {
  return removerCodigoPais(soDigitos(texto));
}

export function telefoneValido(digitos: string): boolean {
  return /^\d{10,11}$/.test(digitos) && Number(digitos.slice(0, 2)) >= 11;
}

/** (34) 99999-0000 — e formata parcialmente enquanto a pessoa digita. */
export function formatarTelefone(texto: string): string {
  const d = normalizarTelefone(texto);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}${resto.length > corte ? `-${resto.slice(corte)}` : ""}`;
}

export interface BuscaInterpretada {
  /** Palavras do nome (sem curingas nem separadores de filtro). */
  nomes: string[];
  /** Trechos numéricos — cada um precisa estar contido no telefone. */
  digitos: string[];
}

// Caracteres que quebrariam o filtro `or(...)` do PostgREST ou virariam curinga do LIKE.
const PERIGOSOS = /[,()%*_\\"'`;:]/g;

/**
 * Interpreta o que foi digitado na busca de clientes:
 * - só número/formatação ("(34) 99999-0000", "34 9999", "+55 34 99999-0000") → um único trecho de dígitos;
 * - palavras → nome; trechos numéricos misturados ("ana 9999") → nome E telefone ao mesmo tempo.
 */
export function interpretarBuscaCliente(entrada: string): BuscaInterpretada {
  const texto = entrada.trim();
  if (!texto) return { nomes: [], digitos: [] };
  if (/^[\d\s()+\-.]+$/.test(texto)) {
    const d = normalizarTelefone(texto);
    return { nomes: [], digitos: d ? [d] : [] };
  }
  const nomes: string[] = [];
  const digitos: string[] = [];
  for (const parte of texto.split(/\s+/)) {
    if (/^[\d()+\-.]+$/.test(parte)) {
      const d = soDigitos(parte);
      if (d) digitos.push(d);
    } else {
      const limpo = parte.replace(PERIGOSOS, "").trim();
      if (limpo) nomes.push(limpo);
    }
  }
  return { nomes, digitos };
}

/** Os 8 últimos dígitos identificam a linha mesmo quando falta/sobra o 9º dígito ou o DDD. */
export function finalDoTelefone(digitos: string): string {
  return digitos.slice(-8);
}

/**
 * Variantes de um telefone BR para casar um número que CHEGA pelo WhatsApp
 * com `clientes.whatsapp` (sempre DDD + número, sem 55).
 *
 * A Meta entrega muitos celulares brasileiros SEM o 9º dígito
 * (ex.: 55 34 9999-1234), enquanto o cadastro tem 11 dígitos. Sem testar as
 * duas formas, a automação não reconhecia o cliente e criava um duplicado.
 * Devolve a forma recebida primeiro.
 */
export function variantesTelefoneBR(texto: string): string[] {
  const d = normalizarTelefone(texto);
  const variantes = [d];
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) variantes.push(`${d.slice(0, 2)}9${d.slice(2)}`);
  if (d.length === 11 && d[2] === "9") variantes.push(`${d.slice(0, 2)}${d.slice(3)}`);
  return variantes;
}
