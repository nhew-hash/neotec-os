import Link from "next/link";
import { Rocket, Flame, DollarSign, TrendingUp, Percent, Building2, HandCoins, Settings } from "lucide-react";
import { listarLeadsProstec, obterDashboardProstec } from "@/services/prostec/prostec.service";
import { LeadsProstecTable } from "@/components/prostec/leads-prostec-table";
import { formatCurrency } from "@/utils";

/**
 * Neotec Prostec fundido no Neotec OS (Fase 187) — prospecção B2B de
 * venda de site. Time completamente separado do time da loja (RLS
 * garante isso — cargo vendedor_prostec nunca vê dado da loja e
 * vice-versa).
 *
 * Escopo desta entrega: o núcleo operacional (dashboard + trabalhar
 * leads já existentes + registrar venda/comissão). O motor de
 * PROSPECÇÃO em si (buscar empresas novas via API externa) depende de
 * chaves de API que ainda precisam ser configuradas — fica pra uma
 * próxima entrega, junto com empresas/configurações/relatório
 * completo de comissão.
 */
export default async function ProstecPage() {
  const [dashboard, leads] = await Promise.all([obterDashboardProstec(), listarLeadsProstec()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Neotec Prostec</h1>
            <p className="text-sm text-muted-foreground">Prospecção B2B — vendas de site</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/prostec/empresas" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Building2 className="h-3.5 w-3.5" />Empresas</Link>
          <Link href="/prostec/comissoes" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><HandCoins className="h-3.5 w-3.5" />Comissões</Link>
          <Link href="/prostec/configuracoes" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Settings className="h-3.5 w-3.5" />Configurações</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CardStat icon={Rocket} label="Total de leads" valor={String(dashboard.totalLeads)} />
        <CardStat icon={Flame} label="Leads quentes" valor={String(dashboard.leadsQuentes)} destaque />
        <CardStat icon={TrendingUp} label="Vendas do mês" valor={String(dashboard.vendasMes)} />
        <CardStat icon={DollarSign} label="Faturamento do mês" valor={formatCurrency(dashboard.faturamentoMes)} destaque />
        <CardStat icon={Percent} label="Comissão do mês" valor={formatCurrency(dashboard.comissaoMes)} />
      </div>

      <LeadsProstecTable leads={leads} />
    </div>
  );
}

function CardStat({ icon: Icon, label, valor, destaque }: { icon: typeof Rocket; label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${destaque ? "text-success" : "text-primary"}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className={`font-display text-xl font-bold ${destaque ? "text-success" : "text-foreground"}`}>{valor}</span>
    </div>
  );
}
