export function calcularDescontoCupom(total: number, tipoDesconto: "percentual" | "valor_fixo" | "cashback", valor: number): number {
  if (tipoDesconto === "percentual") return Math.min(total, total * (valor / 100));
  if (tipoDesconto === "valor_fixo") return Math.min(total, valor);
  return 0; // cashback não desconta na hora — vira crédito de saldo depois da compra aprovada
}
