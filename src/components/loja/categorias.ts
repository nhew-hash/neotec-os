/**
 * Mapa único de categoria → rótulo/ícone/link, usado em toda a loja
 * (navegação, home, rodapé, páginas de categoria) — muda aqui, muda em
 * todo canto.
 *
 * Menu final pedido pelo dono (24/09/2026) — 10 "lugares", nessa ordem
 * exata. A maioria usa a página genérica `/loja/categoria/[categoria]`
 * (filtra por `produtos.categoria`, sem mudar a classificação/import —
 * só o AGRUPAMENTO de exibição, via `categoriaSlugParaCategoriaLoja`
 * em `aplicacao.service.ts`). Duas são especiais, com página própria e
 * mecanismo próprio (não usam `produtos.categoria`):
 *  - "iPhone Lacrado" e "Android / Tablet" → `catalogo_lacrados_*`
 *    (Fase 66/230), filtradas por marca em `/loja/lacrados` (Apple) e
 *    `/loja/android` (não-Apple — inclui tablets, já que o parser da
 *    Realeza trata telefone e tablet Android igual). Por isso têm
 *    `href` fixo em vez de `valor` genérico.
 *  - "iPhone" (valor `iphone`) na prática só recebe iPhone SEMINOVO
 *    (lacrado nunca passa por `produtos` — vê nota acima), por isso o
 *    rótulo é "iPhone Seminovo".
 */
export const CATEGORIAS_LOJA = [
  { valor: "iphone_lacrado", label: "iPhone Lacrado", emoji: "✨", href: "/loja/lacrados" },
  { valor: "iphone", label: "iPhone Seminovo", emoji: "📱" },
  { valor: "android_tablet", label: "Android / Tablet", emoji: "🤖", href: "/loja/android" },
  { valor: "ipad", label: "iPad", emoji: "📲" },
  { valor: "mac", label: "Mac", emoji: "💻" },
  { valor: "apple_watch", label: "Apple Watch", emoji: "⌚" },
  { valor: "audio", label: "Áudio", emoji: "🎧" },
  { valor: "perfume", label: "Perfumes", emoji: "🌸" },
  { valor: "acessorio", label: "Acessórios", emoji: "🔌" },
  { valor: "eletronicos_mobilidade", label: "Eletrônicos e Mobilidade", emoji: "🤖" },
] as const;

/** Link de cada categoria — as duas especiais têm `href` próprio; as demais usam a página genérica. */
export function hrefCategoria(valor: string): string {
  const c = CATEGORIAS_LOJA.find((c) => c.valor === valor);
  return (c && "href" in c ? c.href : undefined) ?? `/loja/categoria/${valor}`;
}

export function labelCategoria(valor: string): string {
  return CATEGORIAS_LOJA.find((c) => c.valor === valor)?.label ?? valor;
}

/**
 * Parcelamento exibido nos cards da grade de produtos — só uma
 * estimativa de "quantas parcelas cabem", sem afirmar juros ou não
 * (não dá pra consultar a taxa real do Mercado Pago por item numa
 * lista inteira, seria uma chamada de API por card). A página do
 * produto mostra a tabela de parcelamento REAL, com juros de verdade
 * quando existir — essa aqui é só um indicativo pra grade.
 */
export function formatarParcelamento(valor: number, parcelas = 12): string {
  const valorParcela = valor / parcelas;
  return `em até ${parcelas}x de ${valorParcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}
