import { Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils";
import type { RegraFrete } from "@/types";

interface SeletorEntregaProps {
  regras: Pick<RegraFrete, "id" | "regiao" | "valor" | "prazo_dias_uteis">[];
  selecionado: { tipo: "retirada" } | { tipo: "entrega"; regiaoId: string };
  onSelecionar: (valor: { tipo: "retirada" } | { tipo: "entrega"; regiaoId: string }) => void;
}

/** "Retirar na loja" (grátis) + as regiões de entrega já configuradas no admin — mesmo seletor, como pedido. */
export function SeletorEntrega({ regras, selecionado, onSelecionar }: SeletorEntregaProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Como você quer receber</p>

      <button
        type="button" onClick={() => onSelecionar({ tipo: "retirada" })}
        className={cn(
          "flex items-center justify-between rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selecionado.tipo === "retirada" ? "border-primary bg-primary/5" : "border-black/[0.08] hover:border-black/20"
        )}
      >
        <span className="flex items-center gap-2 text-sm text-foreground"><Store className="h-4 w-4 text-primary" />Retirar na loja</span>
        <span className="text-sm font-semibold text-success-text">Grátis</span>
      </button>

      {regras.map((r) => (
        <button
          key={r.id} type="button" onClick={() => onSelecionar({ tipo: "entrega", regiaoId: r.id })}
          className={cn(
            "flex items-center justify-between rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selecionado.tipo === "entrega" && selecionado.regiaoId === r.id ? "border-primary bg-primary/5" : "border-black/[0.08] hover:border-black/20"
          )}
        >
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Truck className="h-4 w-4 text-primary" />
            Entrega em {r.regiao}
            <span className="text-xs text-muted-foreground">({r.prazo_dias_uteis} dia{r.prazo_dias_uteis !== 1 ? "s" : ""} útil{r.prazo_dias_uteis !== 1 ? "eis" : ""})</span>
          </span>
          <span className="text-sm font-semibold text-foreground">{r.valor > 0 ? formatCurrency(r.valor) : "Grátis"}</span>
        </button>
      ))}
    </div>
  );
}
