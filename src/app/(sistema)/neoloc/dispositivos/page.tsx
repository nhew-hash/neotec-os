import Link from "next/link";
import { Plus } from "lucide-react";
import { listarDispositivos } from "@/services/neoloc/neoloc.service";
import { formatDateTime } from "@/utils";

const LABEL_STATUS_MDM: Record<string, string> = {
  nao_matriculado: "Não matriculado",
  pendente_matricula: "Matrícula pendente",
  matriculado: "Matriculado",
  removido: "Removido",
  erro_matricula: "Erro na matrícula",
};

export default async function DispositivosNeoLocPage() {
  const dispositivos = await listarDispositivos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Dispositivos NeoLoc</h1>
          <p className="text-sm text-muted-foreground">{dispositivos.length} dispositivo(s) cadastrado(s)</p>
        </div>
        <Link href="/neoloc/dispositivos/novo" className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
          <Plus className="h-3.5 w-3.5" />Cadastrar dispositivo
        </Link>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="p-3 font-medium">Modelo</th>
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Contrato</th>
                <th className="p-3 font-medium">MDM</th>
                <th className="p-3 font-medium">Atraso</th>
                <th className="p-3 font-medium">Última comunicação</th>
                <th className="p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dispositivos.map((d) => (
                <tr key={d.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                  <td className="p-3">
                    <p className="font-medium text-foreground">{d.aparelho?.produto_nome ?? "Aparelho"}</p>
                    <p className="text-xs text-muted-foreground">IMEI {d.aparelho?.imei ?? "—"}{d.aparelho?.cor ? ` · ${d.aparelho.cor}` : ""}</p>
                  </td>
                  <td className="p-3 text-muted-foreground">{d.cliente_nome ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{d.contrato_numero ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{LABEL_STATUS_MDM[d.status_mdm] ?? d.status_mdm}</td>
                  <td className={`p-3 ${d.dias_atraso > 0 ? "font-medium text-red-600" : "text-muted-foreground"}`}>{d.dias_atraso > 0 ? `${d.dias_atraso} dia(s)` : "—"}</td>
                  <td className="p-3 text-muted-foreground">{d.ultimo_checkin ? formatDateTime(d.ultimo_checkin) : "—"}</td>
                  <td className="p-3">
                    <Link href={`/neoloc/dispositivos/${d.id}`} className="text-primary hover:underline">Ver</Link>
                  </td>
                </tr>
              ))}
              {dispositivos.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">Nenhum dispositivo cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
