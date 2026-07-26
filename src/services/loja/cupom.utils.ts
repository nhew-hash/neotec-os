export function calcularDescontoCupom(total: number, tipoDesconto: "percentual" | "valor_fixo", valor: number): number {
  if (tipoDesconto === "percentual") return Math.min(total, total * (valor / 100));
  return Math.min(total, valor);
}
