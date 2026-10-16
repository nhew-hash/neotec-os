/**
 * Regras puras do Web Push (sem banco, sem rede) — testáveis.
 */

export type CategoriaPush = "mensagens" | "retornos" | "aprovacoes" | "capturas";

/** Preferências que a pessoa liga/desliga. "capturas" sempre chega: foi ela mesma que pediu no computador. */
export type PreferenciasPush = { mensagens: boolean; retornos: boolean; aprovacoes: boolean };
export const PREFERENCIAS_PADRAO: PreferenciasPush = { mensagens: true, retornos: true, aprovacoes: true };

export type PayloadPush = {
  titulo: string;
  corpo: string;
  /** Caminho dentro do sistema que abre ao tocar (sempre relativo, ex.: /comunicacao/abc). */
  url: string;
  /** Mesma tag substitui a notificação anterior (ex.: uma por conversa) em vez de empilhar. */
  tag?: string;
};

export function lerPreferencias(valor: unknown): PreferenciasPush {
  const v = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  return {
    mensagens: v.mensagens !== false,
    retornos: v.retornos !== false,
    aprovacoes: v.aprovacoes !== false,
  };
}

export function aceitaCategoria(preferencias: unknown, categoria: CategoriaPush): boolean {
  if (categoria === "capturas") return true;
  return lerPreferencias(preferencias)[categoria];
}

/** 404/410 = a inscrição não existe mais (app desinstalado, permissão revogada): desativar. */
export function inscricaoExpirada(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

/** Só aceita caminho interno — a notificação nunca abre site de fora. */
export function urlSegura(url: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/comunicacao";
}

/** Texto curto da mensagem para a notificação (sem expor mídia: só diz o tipo). */
export function resumoMensagem(tipo: string, conteudo: string | null | undefined): string {
  const texto = (conteudo ?? "").trim();
  const rotulos: Record<string, string> = {
    imagem: "📷 Foto",
    audio: "🎤 Áudio",
    video: "🎬 Vídeo",
    documento: "📄 Documento",
    figurinha: "Figurinha",
    sticker: "Figurinha",
    localizacao: "📍 Localização",
    contato: "👤 Contato",
  };
  if (tipo !== "texto") return texto ? `${rotulos[tipo] ?? "Mídia"}: ${limitar(texto, 100)}` : rotulos[tipo] ?? "Nova mensagem";
  return texto ? limitar(texto, 140) : "Nova mensagem";
}

function limitar(texto: string, max: number): string {
  const limpo = texto.replace(/\s+/g, " ");
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
}

/** IMEI: 15 dígitos com dígito verificador (Luhn). Aceita colado com espaços/traços. */
export function normalizarImei(valor: string): string | null {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 15) return null;
  let soma = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(d[i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    soma += n;
  }
  return soma % 10 === 0 ? d : null;
}

/** Procura um IMEI válido dentro de um texto lido pelo scanner (a etiqueta às vezes traz "IMEI:" ou mais números). */
export function extrairImei(texto: string): string | null {
  const direto = normalizarImei(texto);
  if (direto) return direto;
  for (const m of texto.match(/\d{15,}/g) ?? []) {
    for (let i = 0; i + 15 <= m.length; i++) {
      const c = normalizarImei(m.slice(i, i + 15));
      if (c) return c;
    }
  }
  return null;
}
