"use client";

import { useState, useTransition } from "react";
import { MessageCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conectarWhatsappProstecAction, desconectarWhatsappProstecAction, definirModoOperacaoProstecAction, pausarOuAtivarIaraAction } from "@/services/prostec/prostec.actions";

// Tipo duplicado — nunca importar (nem tipo) de prostec.service.ts num "use client".
interface ConfigWhatsappProstec {
  numero: string | null;
  status: string;
  qr_code: string | null;
  ultima_conexao: string | null;
  modo_operacao: string;
  iara_ativa: boolean;
  mensagens_hoje: number;
  pausado_automaticamente: boolean;
  motivo_pausa_automatica: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  conectado: "Conectado", desconectado: "Desconectado", aguardando_qr: "Aguardando escanear o QR Code", conectando: "Conectando...", erro: "Erro",
};

export function WhatsappProstecForm({ config }: { config: ConfigWhatsappProstec | null }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleConectar() {
    setErro(null);
    startTransition(async () => {
      const result = await conectarWhatsappProstecAction();
      if (!result.success) setErro(result.error);
    });
  }

  function handleDesconectar() {
    setErro(null);
    startTransition(async () => {
      const result = await desconectarWhatsappProstecAction();
      if (!result.success) setErro(result.error);
    });
  }

  function handleModo(modo: "teste" | "piloto" | "autonomo") {
    startTransition(async () => { await definirModoOperacaoProstecAction(modo); });
  }

  function handlePausarAtivar() {
    startTransition(async () => { await pausarOuAtivarIaraAction(!config?.iara_ativa); });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">WhatsApp da Prostec</h2>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${config?.status === "conectado" ? "bg-success/10 text-success-text" : "bg-secondary text-muted-foreground"}`}>
          {STATUS_LABELS[config?.status ?? "desconectado"]}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Número PRÓPRIO da Prostec, mesma arquitetura de QR Code já usada pela loja — precisa de um segundo processo de Bridge rodando
        (endereço diferente do Bridge da loja), configurado com <code className="rounded bg-secondary px-1 py-0.5">WHATSAPP_PROSTEC_BRIDGE_URL</code> e{" "}
        <code className="rounded bg-secondary px-1 py-0.5">WHATSAPP_PROSTEC_BRIDGE_SECRET</code>.
      </p>

      {config?.numero && <p className="text-sm text-foreground">Número conectado: <strong>{config.numero}</strong></p>}

      {config?.status === "aguardando_qr" && config.qr_code && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/40 p-4">
          <QrCode className="h-5 w-5 text-primary" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.qr_code} alt="QR Code do WhatsApp da Prostec" className="h-48 w-48" />
          <p className="text-xs text-muted-foreground">Escaneia com o WhatsApp que vai ser o número da Prostec</p>
        </div>
      )}

      {config?.pausado_automaticamente && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs">
          <p className="font-medium text-danger">⚠ Iara pausada automaticamente pelo circuit breaker</p>
          <p className="mt-1 text-muted-foreground">{config.motivo_pausa_automatica}</p>
        </div>
      )}

      {erro && <p className="text-xs text-danger">{erro}</p>}

      <div className="flex gap-2">
        {config?.status !== "conectado" ? (
          <Button type="button" size="sm" onClick={handleConectar} disabled={isPending}>{isPending ? "Conectando..." : "Conectar (gerar QR Code)"}</Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={handleDesconectar} disabled={isPending}>Desconectar</Button>
        )}
      </div>

      <div className="border-t border-black/[0.06] pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Modo de operação</p>
        <div className="flex gap-1.5">
          {(["teste", "piloto", "autonomo"] as const).map((modo) => (
            <button
              key={modo} type="button" onClick={() => handleModo(modo)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${config?.modo_operacao === modo ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}
            >
              {modo === "teste" ? "🧪 Teste" : modo === "piloto" ? "🟡 Piloto" : "🟢 Autônomo"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {config?.modo_operacao === "teste" && "Nenhuma mensagem real é enviada."}
          {config?.modo_operacao === "piloto" && "Quantidade limitada de leads."}
          {config?.modo_operacao === "autonomo" && "Iara operando dentro dos limites configurados."}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-black/[0.06] pt-3">
        <div>
          <p className="text-xs font-medium text-foreground">Iara {config?.iara_ativa !== false ? "ativa" : "pausada"}</p>
          <p className="text-[11px] text-muted-foreground">Pausada, nenhuma conversa nova é iniciada nem respondida automaticamente.</p>
        </div>
        <Button type="button" size="sm" variant={config?.iara_ativa !== false ? "outline" : "default"} onClick={handlePausarAtivar} disabled={isPending}>
          {config?.iara_ativa !== false ? "Pausar Iara" : "Ativar Iara"}
        </Button>
      </div>
    </div>
  );
}
