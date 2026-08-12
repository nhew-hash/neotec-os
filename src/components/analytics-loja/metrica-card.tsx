import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MetricaPeriodo } from "@/services/analytics/loja-analytics.service";

interface MetricaCardProps {
  titulo: string;
  icon: LucideIcon;
  metrica: MetricaPeriodo;
  formatador?: (valor: number) => string;
  destaque?: "success" | "primary";
}

/** Card de "Hoje / Semana / Mês" com variação — usado pros 6 cards do topo do Analytics de Loja. */
export function MetricaCard({ titulo, icon: Icon, metrica, formatador = (v) => String(v), destaque }: MetricaCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", destaque === "success" ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Hoje</span>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg font-bold text-foreground">{formatador(metrica.hoje)}</span>
            {metrica.variacaoHoje != null && <Variacao valor={metrica.variacaoHoje} />}
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Semana</span>
          <span className="text-sm font-medium text-foreground">{formatador(metrica.semana)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Mês</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{formatador(metrica.mes)}</span>
            {metrica.variacaoMes != null && <Variacao valor={metrica.variacaoMes} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Variacao({ valor }: { valor: number }) {
  const positivo = valor >= 0;
  return (
    <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold", positivo ? "text-success" : "text-danger")}>
      {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(valor)}%
    </span>
  );
}
