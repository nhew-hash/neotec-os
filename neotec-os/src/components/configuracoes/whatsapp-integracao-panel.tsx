"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Smartphone, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  salvarProviderAction, conectarWhatsappWebAction, desconectarWhatsappWebAction,
} from "@/services/integracoes/integracoes-whatsapp.actions";
import { useIntegracaoWhatsappRealtime } from "@/hooks/use-integracao-whatsapp-realtime";
import { formatDateTime } from "@/utils";
import type { IntegracaoWhatsapp, WhatsappProviderTipo, StatusConexaoWhatsapp } from "@/types";

const STATUS_CONFIG: Record<StatusConexaoWhatsapp, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  conectado: { label: "Conectado", tone: "success" },
  aguardando_qr: { label: "Aguardando leitura do QR", tone: "warning" },
  conectando: { label: "Conectando", tone: "info" },
  erro: { label: "Erro", tone: "danger" },
  desconectado: { label: "Desconectado", tone: "neutral" },
};

export function WhatsappIntegracaoPanel({ integracaoInicial }: { integracaoInicial: IntegracaoWhatsapp }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const integracao = useIntegracaoWhatsappRealtime(integracaoInicial) ?? integracaoInicial;

  function handleTrocarProvider(provider: WhatsappProviderTipo) {
    setErro(null);
    startTransition(async () => {
      const result = await salvarProviderAction(provider);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  function handleConectar() {
    setErro(null);
    startTransition(async () => {
      const result = await conectarWhatsappWebAction();
      if (!result.success) setErro(result.error);
    });
  }

  function handleDesconectar() {
    setErro(null);
    startTransition(async () => {
      const result = await desconectarWhatsappWebAction();
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Tipo de conexão</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(["meta_cloud", "whatsapp_web"] as const).map((provider) => (
            <label
              key={provider}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="provider"
                value={provider}
                checked={integracao.provider === provider}
                onChange={() => handleTrocarProvider(provider)}
                disabled={isPending}
                className="h-4 w-4 accent-primary"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {provider === "meta_cloud" ? "Meta Cloud API (oficial)" : "WhatsApp Web (QR Code)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {provider === "meta_cloud"
                    ? "Padrão oficial da Meta — mais estável, exige aprovação da conta"
                    : "Conexão via QR Code — funciona imediatamente, número comercial fora do padrão oficial"}
                </span>
              </div>
            </label>
          ))}
          {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
        </CardContent>
      </Card>

      {integracao.provider === "whatsapp_web" && (
        <Card className="overflow-hidden border-sidebar-border bg-sidebar">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="flex items-center gap-2">
              <StatusBadge label={STATUS_CONFIG[integracao.status].label} tone={STATUS_CONFIG[integracao.status].tone} />
            </div>

            {integracao.status === "conectado" ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                  <Smartphone className="h-6 w-6" />
                </div>
                <p className="font-mono text-sm text-white">{integracao.numero}</p>
                {integracao.ultima_conexao && (
                  <p className="text-xs text-sidebar-muted">Conectado desde {formatDateTime(integracao.ultima_conexao)}</p>
                )}
                <p className="text-xs text-sidebar-muted">{integracao.mensagens_hoje} mensagem(ns) hoje</p>
                <Button variant="destructive" size="sm" onClick={handleDesconectar} disabled={isPending} className="mt-2">
                  <LogOut className="h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            ) : integracao.status === "aguardando_qr" && integracao.qr_code ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-card bg-white p-4 animate-fade-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={integracao.qr_code} alt="QR Code do WhatsApp" className="h-56 w-56" />
                </div>
                <p className="max-w-xs text-center text-xs text-sidebar-muted">
                  Abre o WhatsApp no celular do número comercial → Aparelhos conectados → Conectar um aparelho, e escaneia este código.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-hover text-sidebar-muted">
                  {isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <QrCode className="h-6 w-6" />}
                </div>
                <Button onClick={handleConectar} disabled={isPending}>
                  {isPending ? "Conectando..." : "Exibir QR Code"}
                </Button>
                {integracao.ultimo_erro && (
                  <p className="max-w-xs text-center text-xs text-danger">{integracao.ultimo_erro}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
