import { Users, ShoppingCart, DollarSign, ArrowDown } from "lucide-react";
import type { ResumoLojaAnalytics } from "@/services/analytics/loja-analytics.service";

export function FunilConversao({ resumo }: { resumo: ResumoLojaAnalytics }) {
  const taxaCarrinho = resumo.visitantes.mes > 0 ? Math.round((resumo.carrinhos.mes / resumo.visitantes.mes) * 1000) / 10 : 0;
  const taxaVenda = resumo.visitantes.mes > 0 ? Math.round((resumo.vendas.mes / resumo.visitantes.mes) * 1000) / 10 : 0;

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Conversão (últimos 30 dias)</h3>

      <div className="flex flex-col items-center gap-2">
        <EtapaFunil icon={Users} label="visitantes" valor={resumo.visitantes.mes} cor="text-primary" />
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <EtapaFunil icon={ShoppingCart} label="carrinhos" valor={resumo.carrinhos.mes} cor="text-warning" sublinha={`${taxaCarrinho}% dos visitantes`} />
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <EtapaFunil icon={DollarSign} label="vendas" valor={resumo.vendas.mes} cor="text-success" sublinha={`${taxaVenda}% de conversão total`} />
      </div>
    </div>
  );
}

function EtapaFunil({ icon: Icon, label, valor, cor, sublinha }: { icon: typeof Users; label: string; valor: number; cor: string; sublinha?: string }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3">
      <Icon className={cor + " h-5 w-5 shrink-0"} />
      <div>
        <p className="font-display text-lg font-bold text-foreground">{valor.toLocaleString("pt-BR")} <span className="text-xs font-normal text-muted-foreground">{label}</span></p>
        {sublinha && <p className="text-[11px] text-muted-foreground">{sublinha}</p>}
      </div>
    </div>
  );
}
