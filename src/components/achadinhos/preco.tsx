import { precoAnteriorExibido } from "@/lib/achadinhos/apresentacao";
import type { ProdutoPublico } from "@/lib/achadinhos/tipos";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { TITULO } from "./estilos";

/**
 * Preço do produto. O preço riscado só aparece se houver um anterior MAIOR
 * que o atual; sem preço cadastrado, não inventa nada — manda conferir no
 * Mercado Livre.
 */
export function Preco({ produto, variante }: { produto: Pick<ProdutoPublico, "preco_atual" | "preco_anterior">; variante: "card" | "pdp" }) {
  if (produto.preco_atual == null) {
    return <p className={cn("font-medium text-achados-muted", variante === "pdp" ? "text-base" : "text-sm")}>Veja o preço no Mercado Livre</p>;
  }
  const anterior = precoAnteriorExibido(produto);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
      <span className={cn(TITULO, "font-extrabold tabular-nums tracking-tight text-achados-navy", variante === "pdp" ? "text-4xl sm:text-5xl" : "text-xl")}>
        {formatCurrency(produto.preco_atual)}
      </span>
      {anterior !== null && (
        <span className={cn("tabular-nums text-achados-muted line-through", variante === "pdp" ? "text-lg" : "text-sm")}>
          <span className="sr-only">Preço anterior </span>
          {formatCurrency(anterior)}
        </span>
      )}
    </div>
  );
}
