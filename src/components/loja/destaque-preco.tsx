import { Zap, CreditCard } from "lucide-react";
import { formatCurrency } from "@/utils";
import type { DestaquePrecoLoja } from "@/services/precificacao/precificacao-publico.service";

export function DestaquePreco({ destaque, mostrarPrecoPrincipal = true }: { destaque: DestaquePrecoLoja; mostrarPrecoPrincipal?: boolean }) {
  const temDescontoPix = destaque.percentualDescontoPix > 0;

  return (
    <div className="flex flex-col gap-2">
      {mostrarPrecoPrincipal && (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-foreground">{formatCurrency(destaque.precoVitrine)}</span>
        </div>
      )}

      {temDescontoPix && (
        <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2">
          <Zap className="h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-foreground">
            <span className="font-bold text-success">{formatCurrency(destaque.precoPix)}</span> no Pix
            <span className="ml-1.5 rounded-full bg-success px-2 py-0.5 text-[11px] font-semibold text-white">-{destaque.percentualDescontoPix}%</span>
          </p>
        </div>
      )}

      {destaque.maiorParcelaSemJuros != null && destaque.valorDaMaiorParcelaSemJuros != null && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
          <CreditCard className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Até <span className="font-bold text-primary">{destaque.maiorParcelaSemJuros}x de {formatCurrency(destaque.valorDaMaiorParcelaSemJuros)}</span>
            <span className="ml-1 font-semibold text-primary">sem juros</span>
          </p>
        </div>
      )}
    </div>
  );
}
