import { notFound } from "next/navigation";
import { buscarDispositivoPorId, listarComandosDoDispositivo, listarEventosDoDispositivo } from "@/services/neoloc/neoloc.service";
import { DispositivoAcoes } from "@/components/neoloc/dispositivo-acoes";
import { formatCurrency, formatDateTime } from "@/utils";

const LABEL_STATUS_COMANDO: Record<string, string> = {
  pending: "Pendente", sent: "Enviado", acknowledged: "Confirmado pelo dispositivo", success: "Concluído", failed: "Falhou", expired: "Expirado",
};

export default async function DispositivoNeoLocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dispositivo = await buscarDispositivoPorId(id);
  if (!dispositivo) notFound();

  const [comandos, eventos] = await Promise.all([listarComandosDoDispositivo(id), listarEventosDoDispositivo(id)]);

  const aparelho = dispositivo.aparelho as unknown as { imei: string; numero_serie: string | null; cor: string | null; memoria: string | null; produto: { nome: string } | null } | null;
  const cliente = dispositivo.cliente as unknown as { id: string; nome: string; whatsapp: string } | null;
  const contrato = dispositivo.contrato as unknown as { id: string; numero: string; status: string; valor_pagamento: number | null; frequencia_pagamento: string | null } | null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">{aparelho?.produto?.nome ?? "Aparelho"}</h1>
        <p className="text-sm text-muted-foreground">{aparelho?.memoria ?? ""} {aparelho?.cor ?? ""}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Cliente e contrato</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Cliente</dt><dd className="font-medium text-foreground">{cliente?.nome ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Contrato</dt><dd className="font-medium text-foreground">{contrato?.numero ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Mensalidade</dt><dd className="font-medium text-foreground">{contrato?.valor_pagamento ? formatCurrency(contrato.valor_pagamento) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status do contrato</dt><dd className="font-medium text-foreground">{contrato?.status ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Informações técnicas</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">IMEI</dt><dd className="font-medium text-foreground">{aparelho?.imei ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">IMEI 2</dt><dd className="font-medium text-foreground">{dispositivo.imei2 ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Número de série</dt><dd className="font-medium text-foreground">{aparelho?.numero_serie ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">UDID</dt><dd className="font-medium text-foreground">{dispositivo.udid ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">iOS</dt><dd className="font-medium text-foreground">{dispositivo.ios_versao ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Supervisão</dt><dd className="font-medium text-foreground">{dispositivo.supervisionado === null ? "—" : dispositivo.supervisionado ? "Sim" : "Não"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Activation Lock</dt><dd className="font-medium text-foreground">{dispositivo.activation_lock}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Última comunicação</dt><dd className="font-medium text-foreground">{dispositivo.ultimo_checkin ? formatDateTime(dispositivo.ultimo_checkin) : "—"}</dd></div>
          </dl>
        </div>
      </div>

      <DispositivoAcoes dispositivoId={dispositivo.id} statusMdm={dispositivo.status_mdm} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div className="border-b border-black/[0.06] p-3"><h2 className="text-sm font-semibold text-foreground">Comandos</h2></div>
          <div className="flex flex-col divide-y divide-black/[0.04]">
            {comandos.map((c) => (
              <div key={c.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{c.tipo}</span>
                  <span className="text-xs text-muted-foreground">{LABEL_STATUS_COMANDO[c.status] ?? c.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(c.created_at)} · origem: {c.origem}</p>
                {c.motivo && <p className="mt-1 text-xs text-muted-foreground">{c.motivo}</p>}
              </div>
            ))}
            {comandos.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum comando registrado.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div className="border-b border-black/[0.06] p-3"><h2 className="text-sm font-semibold text-foreground">Auditoria</h2></div>
          <div className="flex flex-col divide-y divide-black/[0.04]">
            {eventos.map((e) => {
              const usuario = e.usuario as unknown as { nome: string } | null;
              return (
                <div key={e.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{e.tipo}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{usuario?.nome ?? "Sistema"}{e.motivo ? ` · ${e.motivo}` : ""}</p>
                </div>
              );
            })}
            {eventos.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum evento registrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
