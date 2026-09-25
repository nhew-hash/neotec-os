import Link from "next/link";
import { Smartphone, Settings, AlertTriangle } from "lucide-react";
import { obterDashboardNeoLoc, listarDispositivos } from "@/services/neoloc/neoloc.service";
import { formatDateTime } from "@/utils";

function CardMetrica({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}

export default async function NeoLocDashboardPage() {
  const [dashboard, dispositivos] = await Promise.all([obterDashboardNeoLoc(), listarDispositivos()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">NeoLoc</h1>
            <p className="text-sm text-muted-foreground">Locação de iPhones com MDM — cadastro, contratos e comandos de dispositivo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/neoloc/dispositivos" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            <Smartphone className="h-3.5 w-3.5" />Dispositivos
          </Link>
          <Link href="/neoloc/configuracoes" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            <Settings className="h-3.5 w-3.5" />Configurações
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica label="Ativos" valor={dashboard.ativos} cor="text-emerald-600" />
        <CardMetrica label="Em cobrança" valor={dashboard.emCobranca} cor="text-amber-600" />
        <CardMetrica label="Bloqueados" valor={dashboard.bloqueados} cor="text-red-600" />
        <CardMetrica label="Em recolhimento" valor={dashboard.emRecolhimento} cor="text-neutral-700" />
        <CardMetrica label="Quitados" valor={dashboard.quitados} cor="text-blue-600" />
        <CardMetrica label="Não matriculados" valor={dashboard.naoMatriculados} cor="text-neutral-500" />
        <CardMetrica label="Offline (48h+)" valor={dashboard.offline} cor="text-red-500" />
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Integração real com o MDM (NanoMDM) ainda não existe — comandos ficam registrados como <strong>pendentes</strong> até a prova de
          conceito em iPhone físico ser validada (Milestone 1). O que já funciona: cadastro de dispositivo, vínculo com contrato/cliente,
          fila de comandos com auditoria, e a régua automática que decide quando bloquear/desbloquear a partir do atraso já calculado pelo Crediário.
        </p>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="border-b border-black/[0.06] p-3">
          <h2 className="text-sm font-semibold text-foreground">Dispositivos recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="p-3 font-medium">Aparelho</th>
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Contrato</th>
                <th className="p-3 font-medium">Status MDM</th>
                <th className="p-3 font-medium">Atraso</th>
                <th className="p-3 font-medium">Última comunicação</th>
              </tr>
            </thead>
            <tbody>
              {dispositivos.slice(0, 15).map((d) => (
                <tr key={d.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                  <td className="p-3">
                    <Link href={`/neoloc/dispositivos/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.aparelho?.produto_nome ?? "Aparelho"} · IMEI {d.aparelho?.imei ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{d.cliente_nome ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{d.contrato_numero ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{d.status_mdm}</td>
                  <td className={`p-3 ${d.dias_atraso > 0 ? "font-medium text-red-600" : "text-muted-foreground"}`}>{d.dias_atraso > 0 ? `${d.dias_atraso} dia(s)` : "—"}</td>
                  <td className="p-3 text-muted-foreground">{d.ultimo_checkin ? formatDateTime(d.ultimo_checkin) : "—"}</td>
                </tr>
              ))}
              {dispositivos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum dispositivo cadastrado ainda. Vá em{" "}
                    <Link href="/neoloc/dispositivos" className="text-primary hover:underline">Dispositivos</Link> para cadastrar um.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
