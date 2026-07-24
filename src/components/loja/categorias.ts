/**
 * Mapa único de categoria → rótulo/ícone, usado em toda a loja
 * (navegação, home, páginas de categoria) — muda aqui, muda em todo canto.
 */
export const CATEGORIAS_LOJA = [
  { valor: "iphone", label: "iPhone", emoji: "📱" },
  { valor: "android", label: "Android", emoji: "📱" },
  { valor: "apple_watch", label: "Apple Watch", emoji: "⌚" },
  { valor: "ipad", label: "iPad", emoji: "📲" },
  { valor: "acessorio", label: "Acessórios", emoji: "🎧" },
] as const;

export function labelCategoria(valor: string): string {
  return CATEGORIAS_LOJA.find((c) => c.valor === valor)?.label ?? valor;
}

/**
 * Parcelamento exibido na loja — informativo (não existe gateway de
 * pagamento real ligado ainda, Fase 2/Mercado Pago). 12x sem juros é o
 * padrão mais comum pra loja desse porte; ajuste aqui se decidir outro
 * número de parcelas.
 */
export function formatarParcelamento(valor: number, parcelas = 12): string {
  const valorParcela = valor / parcelas;
  return `ou ${parcelas}x de ${valorParcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} sem juros`;
}
