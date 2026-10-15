/**
 * Catálogo de venda da Central comercial — parte PURA (sem banco): filtros,
 * ordenação e o texto para mandar ao cliente. O serviço só monta a lista a
 * partir do estoque real; nada aqui inventa preço, parcela ou disponibilidade.
 */
import { formatarCapacidade, semAcento } from "./itens-busca";

export type TipoItemCatalogo = "aparelho" | "produto" | "lacrado";

export interface ItemCatalogo {
  tipo: TipoItemCatalogo;
  id: string;
  nome: string;
  /** Grupo do filtro (ver GRUPOS_CATALOGO). */
  grupo: GrupoCatalogo;
  /** Ex.: ["128 GB", "Preto", "Bateria 87%"] */
  detalhes: string[];
  preco: number;
  foto: string | null;
  bateria: number | null;
  /** Tudo entra na proposta; lacrado vai sob encomenda (vira aparelho "no fornecedor" ao salvar). */
  vaiParaProposta: boolean;
  linkLoja: string | null;
  /** Quantidade em estoque (produto e lacrado); aparelho é sempre 1 unidade. */
  quantidade: number;
}

export const GRUPOS_CATALOGO = [
  { id: "iphone_seminovo", label: "iPhone seminovo" },
  { id: "lacrado", label: "Lacrados" },
  { id: "android", label: "Android" },
  { id: "apple", label: "iPad, Mac e Watch" },
  { id: "acessorio", label: "Acessórios" },
  { id: "audio", label: "Áudio" },
  { id: "perfume", label: "Perfumes" },
  { id: "outros", label: "Outros" },
] as const;
export type GrupoCatalogo = (typeof GRUPOS_CATALOGO)[number]["id"];

/** Categoria do produto (enum do banco) → grupo do catálogo. */
export function grupoDaCategoria(categoria: string | null | undefined, condicao?: string | null): GrupoCatalogo {
  const c = (categoria ?? "").toLowerCase();
  if (c === "iphone") return condicao === "novo" ? "lacrado" : "iphone_seminovo";
  if (["android", "smartphone", "tablet"].includes(c)) return "android";
  if (["ipad", "apple_watch", "notebook"].includes(c)) return "apple";
  if (["audio", "fone", "caixa_de_som", "microfone"].includes(c)) return "audio";
  if (c === "perfume") return "perfume";
  if (c === "acessorio") return "acessorio";
  return "outros";
}

const CONDICAO: Record<string, string> = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };

export function detalhesDoAparelho(a: { memoria?: string | null; cor?: string | null; condicao?: string | null; bateria?: number | null }): string[] {
  const cor = a.cor?.trim();
  return [
    formatarCapacidade(a.memoria),
    cor && !/^n[aã]o informad/i.test(cor) ? cor : null,
    a.condicao ? (CONDICAO[a.condicao] ?? a.condicao) : null,
    a.bateria != null ? `Bateria ${a.bateria}%` : null,
  ].filter((x): x is string => Boolean(x));
}

export type OrdemCatalogo = "relevancia" | "menor_preco" | "maior_preco";

export function filtrarCatalogo(itens: ItemCatalogo[], f: { texto?: string; grupo?: GrupoCatalogo | "todos"; precoMax?: number | null; ordem?: OrdemCatalogo }): ItemCatalogo[] {
  const termos = semAcento(f.texto ?? "").split(/\s+/).filter(Boolean);
  let lista = itens.filter((i) => {
    if (f.grupo && f.grupo !== "todos" && i.grupo !== f.grupo) return false;
    if (f.precoMax != null && f.precoMax > 0 && i.preco > f.precoMax) return false;
    if (termos.length === 0) return true;
    const palheiro = semAcento([i.nome, ...i.detalhes].join(" "));
    const colado = palheiro.replace(/[^a-z0-9]/g, "");
    return termos.every((t) => palheiro.includes(t) || colado.includes(t));
  });
  if (f.ordem === "menor_preco") lista = [...lista].sort((a, b) => a.preco - b.preco);
  else if (f.ordem === "maior_preco") lista = [...lista].sort((a, b) => b.preco - a.preco);
  return lista;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Texto curto para o WhatsApp. Usa só o preço cadastrado e diz que condições
 * (Pix, parcelas, troca) saem na proposta — não promete parcela que o motor não calculou.
 * Sem link da loja virtual (decisão do dono): a venda da Central é da loja física.
 */
export function textoDoItem(itens: ItemCatalogo[]): string {
  const linhas: string[] = [itens.length > 1 ? "Separei estas opções pra você 👇" : "Olha essa opção 👇", ""];
  for (const i of itens) {
    linhas.push(`📱 *${i.nome}*${i.detalhes.length ? ` — ${i.detalhes.join(" · ")}` : ""}`);
    linhas.push(`💰 ${brl(i.preco)}`);
    linhas.push("");
  }
  linhas.push("Parcelamos no cartão e aceitamos seu aparelho na troca. Quer que eu monte a proposta?");
  return linhas.join("\n");
}

/** `?itens=aparelho:uuid,produto:uuid` para abrir a proposta já com os itens escolhidos no catálogo. */
export function paramItensProposta(itens: Pick<ItemCatalogo, "tipo" | "id" | "vaiParaProposta">[]): string {
  return itens.filter((i) => i.vaiParaProposta).map((i) => `${i.tipo}:${i.id}`).join(",");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerParamItensProposta(valor: string | null | undefined): { tipo: "aparelho" | "produto" | "lacrado"; id: string }[] {
  if (!valor) return [];
  const vistos = new Set<string>();
  const saida: { tipo: "aparelho" | "produto" | "lacrado"; id: string }[] = [];
  for (const parte of valor.split(",").slice(0, 20)) {
    const [tipo, id] = parte.split(":");
    if ((tipo !== "aparelho" && tipo !== "produto" && tipo !== "lacrado") || !UUID.test(id ?? "") || vistos.has(parte)) continue;
    vistos.add(parte);
    saida.push({ tipo, id });
  }
  return saida;
}

/**
 * Foto principal de cada grupo do Banco de imagens — mesma ordem da loja
 * (`listar_produtos_loja`): ordem 0 primeiro, depois as de cenário, depois o resto.
 */
export function fotoPrincipalPorGrupo(fotos: { grupo_id: string; url: string; ordem: number | null; tipo: string | null }[]): Map<string, string> {
  const peso = (f: { ordem: number | null; tipo: string | null }) => (f.ordem === 0 ? 0 : f.tipo === "cenario" ? 1 : 2);
  const melhor = new Map<string, { url: string; peso: number; ordem: number }>();
  for (const f of fotos) {
    const atual = melhor.get(f.grupo_id);
    const candidato = { url: f.url, peso: peso(f), ordem: f.ordem ?? Number.MAX_SAFE_INTEGER };
    if (!atual || candidato.peso < atual.peso || (candidato.peso === atual.peso && candidato.ordem < atual.ordem)) melhor.set(f.grupo_id, candidato);
  }
  return new Map([...melhor].map(([k, v]) => [k, v.url]));
}
