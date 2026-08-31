"use client";

import { useState, useTransition } from "react";
import { PenTool, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CapturaAssinatura } from "@/components/impressao/captura-assinatura";
import { enviarParaAssinaturaAction, confirmarAssinaturaRegistradaAction, cancelarContratoAction } from "@/services/contratos/contrato.actions";

interface Signatario { id: string; papel: string; nome: string; status: string }
interface Contrato { id: string; status: string }

const LABEL_STATUS_SIGNATARIO: Record<string, string> = {
  pendente: "Pendente", enviado: "Enviado", visualizado: "Visualizado", assinado: "✅ Assinado", recusado: "❌ Recusado", expirado: "Expirado", cancelado: "Cancelado",
};

export function ContratoAcoesPainel({ contrato, signatarios }: { contrato: Contrato; signatarios: Signatario[] }) {
  const [isPending, startTransition] = useTransition();
  const [signatarioAssinando, setSignatarioAssinando] = useState<Signatario | null>(null);

  function handleEnviar() {
    startTransition(() => { void enviarParaAssinaturaAction(contrato.id); });
  }

  function handleCancelar() {
    const motivo = window.prompt("Motivo do cancelamento:");
    if (!motivo?.trim()) return;
    startTransition(() => { void cancelarContratoAction(contrato.id, motivo.trim()); });
  }

  async function handleAssinaturaSalva() {
    if (!signatarioAssinando) return;
    await confirmarAssinaturaRegistradaAction({ contratoId: contrato.id, signatarioId: signatarioAssinando.id, papel: signatarioAssinando.papel });
    setSignatarioAssinando(null);
  }

  const podeEnviar = contrato.status === "rascunho" || contrato.status === "em_revisao";
  const podeCancelar = !["assinado", "ativo", "encerrado", "cancelado", "rescindido"].includes(contrato.status);
  const podeAssinar = ["aguardando_assinatura", "assinatura_parcial"].includes(contrato.status);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Signatários e ações</h2>

      <div className="mb-3 flex flex-col gap-2">
        {signatarios.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl bg-secondary/40 p-2.5 text-xs">
            <div>
              <p className="font-medium capitalize text-foreground">{s.papel}</p>
              <p className="text-muted-foreground">{s.nome}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{LABEL_STATUS_SIGNATARIO[s.status] ?? s.status}</span>
              {podeAssinar && s.status !== "assinado" && (
                <Button type="button" size="sm" variant="outline" onClick={() => setSignatarioAssinando(s)} className="h-7 gap-1 px-2 text-xs">
                  <PenTool className="h-3 w-3" />Assinar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {podeEnviar && <Button type="button" size="sm" onClick={handleEnviar} disabled={isPending} className="gap-1.5"><Send className="h-3.5 w-3.5" />Enviar pra assinatura</Button>}
        {podeCancelar && <Button type="button" size="sm" variant="outline" onClick={handleCancelar} disabled={isPending} className="gap-1.5 text-danger hover:text-danger"><XCircle className="h-3.5 w-3.5" />Cancelar contrato</Button>}
      </div>

      {signatarioAssinando && (
        <CapturaAssinatura
          aberto={!!signatarioAssinando}
          onFechar={() => setSignatarioAssinando(null)}
          tipoDocumento="contrato"
          referenciaId={contrato.id}
          tipoAssinante={signatarioAssinando.papel as "cliente" | "fiador" | "neotec"}
          onSalvo={handleAssinaturaSalva}
        />
      )}
    </div>
  );
}
