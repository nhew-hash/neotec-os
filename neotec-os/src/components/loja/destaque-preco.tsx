import { Zap, CreditCard, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils";
import type { DestaquePrecoLoja } from "@/services/precificacao/precificacao-publico.service";

/**
 * Pix é o preço que a loja de fato cadastra (Fase 96) — por isso é
 * ele quem tem o destaque visual principal aqui, não o vitrine. O
 * vitrine (preço "cheio", usado como referência pro parcelamento)
 * aparece bem menor, do lado.
 */
export function DestaquePreco({ destaque }: { destaque: DestaquePrecoLoja }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3">
        <Zap className="h-5 w-5 shrink-0 text-success" />
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-success">{formatCurrency(destaque.precoPix)}</span>
            <span className="text-sm font-semibold text-success-text">no Pix</span>
          </div>
          {destaque.precoVitrine > destaque.precoPix && (
            <p className="text-xs text-muted-foreground">
              ou {formatCurrency(destaque.precoVitrine)} no cartão
              {destaque.percentualDescontoPix > 0 && <span className="ml-1 font-medium text-success-text">(economize {destaque.percentualDescontoPix}%)</span>}
            </p>
          )}
        </div>
      </div>

      {destaque.maiorParcelaSemJuros != null && destaque.valorDaMaiorParcelaSemJuros != null && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
          <CreditCard className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Até <span className="font-bold text-primary">{destaque.maiorParcelaSemJuros}x de {formatCurrency(destaque.valorDaMaiorParcelaSemJuros)}</span>
            <span className="ml-1 font-semibold text-primary">sem juros</span>
          </p>
        </div>
      )}

      {destaque.cashbackValor != null && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2">
          <Wallet className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-foreground">
            Ganhe <span className="font-bold text-warning-text">{formatCurrency(destaque.cashbackValor)}</span>
            <span className="ml-1 font-semibold text-warning-text">de cashback</span> nessa compra
          </p>
        </div>
      )}
    </div>
  );
}
