import { cn } from "@/lib/utils";
import { RECORTE_ETIQUETA, TITULO } from "./estilos";

/**
 * A "etiqueta de preço" — assinatura visual do Achadinhos. Só renderiza com
 * um percentual que FOI INFORMADO no cadastro (ver `descontoExibido`).
 */
export function EtiquetaDesconto({ percentual, className }: { percentual: number; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center bg-achados-lime py-1 pl-[18px] pr-3 text-sm font-extrabold tabular-nums text-achados-navy",
        TITULO,
        className
      )}
      style={{ clipPath: RECORTE_ETIQUETA, borderRadius: "0 8px 8px 0" }}
    >
      <span aria-hidden className="absolute left-[9px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" />
      <span className="sr-only">Desconto de </span>-{percentual}%
    </span>
  );
}
