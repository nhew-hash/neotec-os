import Link from "next/link";
import { Rocket, Flame, DollarSign, TrendingUp, Percent, Building2, HandCoins, Settings, Trophy, Clock, MessageCircle } from "lucide-react";
import {
  listarLeadsProstec, obterDashboardProstec, obterFunilProstec, listarAtividadesProstec, obterResumoFollowupsProstec,
} from "@/services/prostec/prostec.service";
import { LeadsProstecTable } from "@/components/prostec/leads-prostec-table";
import { NovaBuscaForm } from "@/components/prostec/nova-busca-form";
import { PipelineKanban } from "@/components/prostec/pipeline-kanban";
import { formatCurrency, formatDateTime } from "@/utils";

const FUNIL_LABELS: Record<string, string> = {
  novo: "Novos leads", contato_realizado: "Contatados", qualificado: "Qualificados", reuniao: "Reuniões",
  proposta_enviada: "Propostas", negociacao: "Negociação", venda_fechada: "Vendas",
};

export default async function ProstecPage() {
  const [dashboard, leads, funil, atividades, followups] = await Promise.all([
    obterDashboardProstec(), listarLeadsProstec(), obterFunilProstec(), listarAtividadesProstec(10), obterResumoFollowupsProstec(),
  ]);

  const etapasFunil = ["novo", "contato_realizado", "qualificado", "reuniao", "proposta_enviada", "negociacao", "venda_fechada"] as const;
  const maiorValor = Math.max(...etapasFunil.map((e) => funil[e]), 1);

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
          <Link href="/prostec/inbox" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><MessageCircle className="h-3.5 w-3.5" />Inbox</Link>
          <Link href="/prostec/ranking" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Trophy className="h-3.5 w-3.5" />Ranking</Link>
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

      {(followups.atrasados > 0 || followups.hoje > 0) && (
        <div className="flex items-center gap-4 rounded-2xl border border-warning/30 bg-warning-soft p-3 text-xs">
          <Clock className="h-4 w-4 shrink-0 text-warning-text" />
          {followups.atrasados > 0 && <span className="font-medium text-warning-text">🔴 {followups.atrasados} follow-up{followups.atrasados !== 1 ? "s" : ""} atrasado{followups.atrasados !== 1 ? "s" : ""}</span>}
          {followups.hoje > 0 && <span className="font-medium text-warning-text">🟠 {followups.hoje} pra hoje</span>}
          {followups.proximos > 0 && <span className="text-muted-foreground">🟢 {followups.proximos} próximo{followups.proximos !== 1 ? "s" : ""}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Funil</h2>
          <div className="flex flex-col gap-1.5">
            {etapasFunil.map((etapa) => (
              <div key={etapa} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{FUNIL_LABELS[etapa]}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(funil[etapa] / maiorValor) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-foreground">{funil[etapa]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Atividade recente</h2>
          {atividades.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma atividade ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {atividades.map((a) => (
                <div key={a.id} className="border-b border-black/[0.04] pb-2 text-xs last:border-0">
                  <p className="text-foreground">{a.descricao}</p>
                  <p className="text-[10px] text-muted-foreground">{a.lead_empresa_nome && `${a.lead_empresa_nome} · `}{a.usuario_nome ?? "—"} · {formatDateTime(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NovaBuscaForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pipeline</h2>
        <PipelineKanban leads={leads} />
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
