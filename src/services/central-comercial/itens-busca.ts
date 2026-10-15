/**
 * Busca de aparelhos e produtos para a proposta — parte PURA (sem banco): rótulos legíveis,
 * normalização e casamento por termos. O serviço só traz candidatos; a decisão de "bate com tudo
 * que foi digitado" fica aqui, testável.
 */
export interface ItemBusca {
  tipo: "aparelho" | "produto";
  id: string;
  rotulo: string;
  preco: number;
  /** Complemento que ajuda a distinguir iguais (ex.: final do IMEI, saldo em estoque). */
  detalhe: string | null;
}

export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function termosDaBusca(q: string): string[] {
  return semAcento(q).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 8);
}

const CONDICAO: Record<string, string> = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };

/** "128GB" → "128 GB", "1tb" → "1 TB"; outros valores passam como vieram. */
export function formatarCapacidade(memoria: string | null | undefined): string | null {
  if (!memoria) return null;
  const m = memoria.trim().match(/^(\d+)\s*(gb|tb)$/i);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : memoria.trim();
}

export function rotuloAparelho(p: { nome?: string | null; memoria?: string | null; cor?: string | null; condicao?: string | null }): string {
  return [p.nome?.trim() || "Aparelho", formatarCapacidade(p.memoria), p.cor?.trim() || null, p.condicao ? (CONDICAO[p.condicao] ?? p.condicao) : null].filter(Boolean).join(" · ");
}

/** Todos os termos digitados precisam aparecer (inclusive "128gb" contra "128 GB"). */
export function corresponde(textos: (string | null | undefined)[], termos: string[]): boolean {
  if (termos.length === 0) return true;
  const palheiro = semAcento(textos.filter(Boolean).join(" "));
  const colado = palheiro.replace(/[^a-z0-9]/g, "");
  return termos.every((t) => palheiro.includes(t) || colado.includes(t));
}

export function finalDoImei(imei: string | null | undefined): string | null {
  const d = (imei ?? "").replace(/\D/g, "");
  return d.length >= 4 ? `IMEI …${d.slice(-4)}` : null;
}

export function paginar<T>(itens: T[], pagina: number, limite: number): { pagina: T[]; temMais: boolean } {
  const de = Math.max(pagina, 0) * limite;
  return { pagina: itens.slice(de, de + limite), temMais: itens.length > de + limite };
}
