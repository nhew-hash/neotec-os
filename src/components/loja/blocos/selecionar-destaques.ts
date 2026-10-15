import type { ProdutoLoja } from "@/types";

/** Ordem de prioridade das categorias na vitrine da home (loja Apple primeiro). */
const PRIORIDADE = ["iphone", "apple_watch", "ipad", "mac", "audio", "smartphone", "android", "tablet", "acessorio", "eletronicos_mobilidade", "perfume"];

/**
 * Vitrine de destaques: antes eram só os N primeiros da lista (os últimos
 * atualizados) — uma importação de perfumes enchia a home de perfume e
 * entrava até produto sem foto. Agora: só com foto e preço, alternando
 * categorias pela prioridade (1 de cada, depois o 2º de cada…).
 */
export function selecionarDestaques(produtos: ProdutoLoja[], quantidade: number): ProdutoLoja[] {
  const elegiveis = produtos.filter((p) => (p.fotos?.length ?? 0) > 0 && p.preco_venda != null && p.preco_venda > 0);
  const porCategoria = new Map<string, ProdutoLoja[]>();
  for (const p of elegiveis) {
    const lista = porCategoria.get(p.categoria) ?? [];
    lista.push(p);
    porCategoria.set(p.categoria, lista);
  }
  const ordem = [...porCategoria.keys()].sort((a, b) => rank(a) - rank(b));
  const resultado: ProdutoLoja[] = [];
  for (let rodada = 0; resultado.length < quantidade; rodada++) {
    let algum = false;
    for (const cat of ordem) {
      const p = porCategoria.get(cat)![rodada];
      if (p) { resultado.push(p); algum = true; if (resultado.length >= quantidade) break; }
    }
    if (!algum) break;
  }
  return resultado;
}

function rank(categoria: string): number {
  const i = PRIORIDADE.indexOf(categoria);
  return i === -1 ? PRIORIDADE.length : i;
}
