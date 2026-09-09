/**
 * Mapa único de categoria → rótulo/ícone, usado em toda a loja
 * (navegação, home, páginas de categoria) — muda aqui, muda em todo canto.
 */
export const CATEGORIAS_LOJA = [
  { valor: "iphone", label: "iPhone", emoji: "📱" },
  { valor: "apple_watch", label: "Apple Watch", emoji: "⌚" },
  { valor: "ipad", label: "iPad", emoji: "📲" },
  { valor: "mac", label: "Mac", emoji: "💻" },
  { valor: "acessorio", label: "Acessórios", emoji: "🎧" },
] as const;

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
