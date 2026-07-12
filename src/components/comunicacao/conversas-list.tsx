"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime, formatWhatsapp, getInitials } from "@/utils";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  aguardando_cliente: "Aguardando",
  resolvida: "Resolvida",
  perdida: "Perdida",
};

export function ConversasList({ conversas }: { conversas: ConversaComCliente[] }) {
  const pathname = usePathname();

  if (conversas.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Nenhuma conversa ainda. Elas aparecem aqui assim que o webhook do WhatsApp receber a primeira mensagem.
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversas.map((conversa) => {
        const isActive = pathname === `/comunicacao/${conversa.id}`;
        return (
          <Link
            key={conversa.id}
            href={`/comunicacao/${conversa.id}`}
            className={cn(
              "flex items-center gap-3 border-b border-border p-3 transition-colors",
              isActive ? "bg-primary/5" : "hover:bg-secondary"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(conversa.cliente?.nome ?? conversa.telefone)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {conversa.cliente?.nome ?? formatWhatsapp(conversa.telefone)}
                </span>
                {conversa.nao_lidas > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {conversa.nao_lidas}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="w-fit text-[10px]">{STATUS_LABEL[conversa.status]}</Badge>
                {conversa.ultima_mensagem_em && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateTime(conversa.ultima_mensagem_em)}</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
