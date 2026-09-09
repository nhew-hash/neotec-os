import Link from "next/link";
import { CreditCard, Users, Settings, TrendingUp, Plus } from "lucide-react";
import { obterDashboardCrediario, listarPropostas } from "@/services/crediario/crediario.service";
import { formatCurrency, formatDate } from "@/utils";

const LABEL_STATUS: Record<string, string> = {
  em_analise: "Em análise", aprovada: "Aprovada", reprovada: "Reprovada", convertida_contrato: "Virou contrato", cancelada: "Cancelada",
};

export default async function CrediarioDashboardPage() {
  const [dashboard, propostas] = await Promise.all([obterDashboardCrediario(), listarPropostas()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Crediário Neotec</h1>
            <p className="text-sm text-muted-foreground">Locação de aparelhos com opção de aquisição</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/crediario/fiadores" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Users className="h-3.5 w-3.5" />Fiadores</Link>
          <Link href="/crediario/risco" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><TrendingUp className="h-3.5 w-3.5" />Risco</Link>
          <Link href="/crediario/configuracoes" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Settings className="h-3.5 w-3.5" />Configurações</Link>
          <Link href="/crediario/propostas/nova" className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"><Plus className="h-3.5 w-3.5" />Nova análise</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica label="Carteira ativa" valor={String(dashboard.carteiraAtiva)} />
        <CardMetrica label="Valor contratado" valor={formatCurrency(dashboard.valorContratado)} />
        <CardMetrica label="Recebido" valor={formatCurrency(dashboard.recebido)} destaque />
        <CardMetrica label="Em atraso" valor={formatCurrency(dashboard.emAtraso)} alerta={dashboard.emAtraso > 0} />
        <CardMetrica label="A receber" valor={formatCurrency(dashboard.valorAReceber)} />
        <CardMetrica label="Taxa de inadimplência" valor={`${dashboard.taxaInadimplencia}%`} alerta={dashboard.taxaInadimplencia > 10} />
        <CardMetrica label="Exposição total" valor={formatCurrency(dashboard.exposicaoTotal)} />
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="border-b border-black/[0.06] p-3">
          <h2 className="text-sm font-semibold text-foreground">Propostas recentes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Score</th>
              <th className="p-3 font-medium">Classe</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {propostas.slice(0, 10).map((p) => (
              <tr key={p.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                <td className="p-3"><Link href={`/crediario/propostas/${p.id}`} className="font-medium text-primary hover:underline">{p.cliente_nome}</Link></td>
                <td className="p-3 text-muted-foreground">{p.score_neotec ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.classe_nome ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{LABEL_STATUS[p.status] ?? p.status}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {propostas.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhuma proposta criada ainda.</p>}
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
