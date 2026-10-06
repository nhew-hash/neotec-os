import { limparParametro } from "@/lib/achadinhos/apresentacao";
import { validarLinkAfiliado } from "@/lib/achadinhos/link";
import type { OrigemAfiliado } from "@/lib/achadinhos/tipos";

/**
 * Fase 263 — evento `affiliate_click`. Funções PURAS (sem banco, sem Next)
 * pra decidir o destino e montar o registro; a rota
 * `/achadinhos/ir/[slug]` faz a parte de I/O.
 *
 * Privacidade: grava só produto, slug, momento, página, posição do clique
 * e UTMs. NÃO grava IP, user-agent, cookie nem identificador do visitante.
 */

/** Onde dentro do site o clique aconteceu (o "source" do briefing). */
export const ORIGENS_CLIQUE = ["pdp", "pdp_fixo", "card"] as const;

export interface ProdutoParaClique {
  id: string;
  slug: string;
  loja_id: string;
  link_afiliado: string;
  origem: OrigemAfiliado;
  status: string;
  excluido_em: string | null;
}

export type Destino =
  | { tipo: "afiliado"; url: string }
  | { tipo: "catalogo" };

/**
 * Produto inexistente, pausado, arquivado, excluído ou com link inválido →
 * volta pro catálogo (quem abre um link antigo compartilhado cai numa tela
 * útil, nunca num erro nem num destino não confiável).
 */
export function decidirDestino(produto: ProdutoParaClique | null): Destino {
  if (!produto || produto.status !== "ativo" || produto.excluido_em) return { tipo: "catalogo" };
  const l = validarLinkAfiliado(produto.link_afiliado, produto.origem);
  return l.ok ? { tipo: "afiliado", url: l.url } : { tipo: "catalogo" };
}

export function normalizarOrigemClique(valor: string | null | undefined): string | null {
  const v = limparParametro(valor, 20);
  if (!v) return null;
  return (ORIGENS_CLIQUE as readonly string[]).includes(v) ? v : "outro";
}

/** Só o caminho interno (sem domínio, sem query, sem fragmento) — nunca uma URL externa. */
export function normalizarPagina(valor: string | null | undefined): string | null {
  const v = limparParametro(valor, 300);
  if (!v || !v.startsWith("/") || v.startsWith("//")) return null;
  const caminho = v.split(/[?#]/)[0];
  return caminho.slice(0, 200) || null;
}

export interface ParametrosClique {
  p?: string | null;
  o?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

export function montarRegistroClique(produto: ProdutoParaClique, params: ParametrosClique) {
  return {
    loja_id: produto.loja_id,
    produto_id: produto.id,
    produto_slug: produto.slug,
    pagina: normalizarPagina(params.p),
    origem: normalizarOrigemClique(params.o),
    utm_source: limparParametro(params.utm_source),
    utm_medium: limparParametro(params.utm_medium),
    utm_campaign: limparParametro(params.utm_campaign),
    utm_content: limparParametro(params.utm_content),
  };
}
