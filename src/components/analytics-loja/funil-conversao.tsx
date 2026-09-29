import { Eye, ShoppingCart, CreditCard, DollarSign, ArrowDown } from "lucide-react";
import type { ResumoLojaAnalytics } from "@/services/analytics/loja-analytics.service";

/**
 * Fase 255: o funil pulava direto de "visitantes" pra "vendas" — as
 * etapas de visualização e checkout iniciado (que já existiam gravadas
 * no banco desde a Fase 197, e nunca eram lidas por nenhum service)
 * ficavam invisíveis. Agora mostra o funil de verdade: visualização →
 * carrinho → checkout iniciado → pagamento aprovado.
 */
export function FunilConversao({ resumo }: { resumo: ResumoLojaAnalytics }) {
  const { visualizacoes, carrinhos, checkoutIniciado, pagamentoAprovado } = resumo.funilCheckout;

  const taxaCarrinho = visualizacoes > 0 ? Math.round((carrinhos / visualizacoes) * 1000) / 10 : 0;
  const taxaCheckout = carrinhos > 0 ? Math.round((checkoutIniciado / carrinhos) * 1000) / 10 : 0;
  const taxaPagamento = visualizacoes > 0 ? Math.round((pagamentoAprovado / visualizacoes) * 1000) / 10 : 0;

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Conversão (últimos 30 dias)</h3>

      <div className="flex flex-col items-center gap-2">
        <EtapaFunil icon={Eye} label="visualizações" valor={visualizacoes} cor="text-primary" />
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <EtapaFunil icon={ShoppingCart} label="carrinhos" valor={carrinhos} cor="text-warning" sublinha={`${taxaCarrinho}% das visualizações`} />
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <EtapaFunil icon={CreditCard} label="checkout iniciado" valor={checkoutIniciado} cor="text-warning" sublinha={`${taxaCheckout}% dos carrinhos`} />
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <EtapaFunil icon={DollarSign} label="pagamento aprovado" valor={pagamentoAprovado} cor="text-success" sublinha={`${taxaPagamento}% de conversão total`} />
      </div>
    </div>
  );
}

function EtapaFunil({ icon: Icon, label, valor, cor, sublinha }: { icon: typeof Eye; label: string; valor: number; cor: string; sublinha?: string }) {
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
