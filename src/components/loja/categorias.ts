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
