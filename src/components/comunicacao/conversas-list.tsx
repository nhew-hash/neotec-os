"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateTime, formatWhatsapp, getInitials } from "@/utils";
import { useConversasRealtime } from "@/hooks/use-conversas-realtime";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  aguardando_cliente: "Aguardando",
  resolvida: "Resolvida",
  perdida: "Perdida",
};

type Filtro = "todos" | "nao_lidas" | "ia_ativa" | "ia_pausada";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "nao_lidas", label: "Não lidas" },
  { value: "ia_ativa", label: "IA ativa" },
  { value: "ia_pausada", label: "Aguardando humano" },
];

export function ConversasList({ conversas: conversasIniciais }: { conversas: ConversaComCliente[] }) {
  const pathname = usePathname();
  const conversas = useConversasRealtime(conversasIniciais);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const conversasFiltradas = useMemo(() => {
    let lista = conversas;

    if (filtro === "nao_lidas") lista = lista.filter((c) => c.nao_lidas > 0);
    else if (filtro === "ia_ativa") lista = lista.filter((c) => !c.ia_pausada);
    else if (filtro === "ia_pausada") lista = lista.filter((c) => c.ia_pausada);

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter(
        (c) => c.cliente?.nome?.toLowerCase().includes(termo) || c.telefone.includes(termo.replace(/\D/g, ""))
      );
    }

    return lista;
  }, [conversas, filtro, busca]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                filtro === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {conversasFiltradas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {conversas.length === 0
            ? "Nenhuma conversa ainda. Elas aparecem aqui assim que o webhook do WhatsApp receber a primeira mensagem."
            : "Nenhuma conversa bate com esse filtro/busca."}
        </div>
      ) : (
        <div className="flex flex-col overflow-y-auto">
          {conversasFiltradas.map((conversa) => {
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
      )}
    </div>
  );
}
