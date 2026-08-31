import { TrendingUp } from "lucide-react";
import { obterDashboardRisco } from "@/services/crediario/crediario.service";
import { formatCurrency } from "@/utils";

export default async function DashboardRiscoPage() {
  const dashboard = await obterDashboardRisco();
  const maiorContagem = Math.max(...dashboard.clientesPorClasse.map((c) => c.quantidade), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Dashboard de Risco</h1>
          <p className="text-sm text-muted-foreground">Carteira do crediário por classe de risco</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica label="Taxa de pagamento" valor={`${dashboard.taxaPagamento}%`} destaque />
        <CardMetrica label="Taxa de atraso" valor={`${dashboard.taxaAtraso}%`} alerta={dashboard.taxaAtraso > 15} />
        <CardMetrica label="Ticket médio" valor={formatCurrency(dashboard.ticketMedio)} />
        <CardMetrica label="Perda por R$1.000 de carteira" valor={formatCurrency(dashboard.perdaPor1000)} alerta={dashboard.perdaPor1000 > 50} />
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Clientes por classe</h2>
        {dashboard.clientesPorClasse.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum contrato convertido ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dashboard.clientesPorClasse.map((c) => (
              <div key={c.classe} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-medium text-foreground">{c.classe}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(c.quantidade / maiorContagem) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{c.quantidade}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardMetrica({ label, valor, destaque, alerta }: { label: string; valor: string; destaque?: boolean; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`font-display text-lg font-bold ${alerta ? "text-danger" : destaque ? "text-success" : "text-foreground"}`}>{valor}</span>
    </div>
  );
}
