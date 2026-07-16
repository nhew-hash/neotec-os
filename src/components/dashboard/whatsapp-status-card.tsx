import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/utils";
import type { IntegracaoWhatsapp, StatusConexaoWhatsapp } from "@/types";

const STATUS_CONFIG: Record<StatusConexaoWhatsapp, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  conectado: { label: "Conectado", tone: "success" },
  aguardando_qr: { label: "Aguardando QR", tone: "warning" },
  conectando: { label: "Conectando", tone: "info" },
  erro: { label: "Erro", tone: "danger" },
  desconectado: { label: "Desconectado", tone: "neutral" },
};

export function WhatsappStatusCard({ integracao }: { integracao: IntegracaoWhatsapp | null }) {
  if (!integracao) return null;

  const conectado = integracao.status === "conectado";

  return (
    <Link href="/configuracoes/integracoes/whatsapp">
      <Card className="transition-shadow hover:shadow-card-hover">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${conectado ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}`}>
              <MessageCircle className="h-[18px] w-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
              <StatusBadge label={STATUS_CONFIG[integracao.status].label} tone={STATUS_CONFIG[integracao.status].tone} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            {integracao.numero && <span className="font-mono text-xs text-muted-foreground">{integracao.numero}</span>}
            <span className="text-xs text-muted-foreground">{integracao.mensagens_hoje} hoje</span>
            {integracao.ultima_conexao && (
              <span className="text-[10px] text-muted-foreground">desde {formatDateTime(integracao.ultima_conexao)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
