import { TrendingUp, Users, Target } from "lucide-react";
import type { ResumoMarketing } from "@/services/analytics/loja-analytics.service";
import { formatCurrency } from "@/utils";

/**
 * Fase 262 — responde as perguntas do briefing ao olhar o painel:
 * "Quantas pessoas chegaram pelo Meta?", "Quantas viraram lead?",
 * "Qual campanha trouxe vendas?". Mesmo estilo visual dos cards/
 * seções já existentes (`OrigemAcessos`, `MetricaCard`) — não é um
 * dashboard novo, é uma seção a mais no mesmo painel.
 */
export function MarketingCampanhas({ resumo }: { resumo: ResumoMarketing }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-foreground">📣 Marketing — últimos 30 dias</h3>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary/40 p-3">
          <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" />Vindos do Meta</div>
          <p className="font-display text-lg font-semibold text-foreground">{resumo.visitantesMeta}</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Target className="h-3 w-3" />Leads (WhatsApp)</div>
          <p className="font-display text-lg font-semibold text-foreground">{resumo.leadsTotal}</p>
        </div>
        <div className="rounded-xl bg-success/10 p-3">
          <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><TrendingUp className="h-3 w-3" />Receita atribuída</div>
          <p className="font-display text-lg font-semibold text-success-text">{formatCurrency(resumo.receitaAtribuida)}</p>
        </div>
      </div>

      {resumo.porCampanha.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma venda com UTM/fbclid identificado ainda — configure o Pixel e os links de campanha (ver Configurações → Meta Ads) pra esta seção começar a preencher.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <span>Campanha</span>
            <span>Vendas · Receita</span>
          </div>
          {resumo.porCampanha.slice(0, 8).map((c) => (
            <div key={c.campanha} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
              <span className="truncate text-foreground">{c.campanha}</span>
              <span className="shrink-0 font-medium text-foreground">{c.pedidos} · {formatCurrency(c.receita)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
