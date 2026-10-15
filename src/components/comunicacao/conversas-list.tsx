"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bot, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatHorarioCurto, getInitials } from "@/utils";
import { soDigitos } from "@/lib/telefone";
import { FILTROS, filtrarConversas, nomeDaConversa, type Filtro } from "./conversas-filtro";
import { useConversasRealtime } from "@/hooks/use-conversas-realtime";
import { buscarConversasAction } from "@/services/whatsapp/whatsapp.actions";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const STATUS_LABEL: Record<string, string> = {
  aguardando_cliente: "Aguardando cliente",
  resolvida: "Resolvida",
  perdida: "Perdida",
};

export function ConversasList({ conversas: conversasIniciais, usuarioId }: { conversas: ConversaComCliente[]; usuarioId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const conversas = useConversasRealtime(conversasIniciais);
  const [busca, setBusca] = useState(searchParams.get("busca") ?? "");
  const [filtro, setFiltro] = useState<Filtro>(() => {
    const f = searchParams.get("filtro");
    return FILTROS.some((x) => x.value === f) ? (f as Filtro) : "todos";
  });
  const [doServidor, setDoServidor] = useState<ConversaComCliente[] | null>(null);
  const [buscandoServidor, startBusca] = useTransition();
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const conversasFiltradas = useMemo(() => filtrarConversas(conversas, filtro, busca, usuarioId), [conversas, filtro, busca, usuarioId]);

  useEffect(() => { setDoServidor(null); setErroBusca(null); }, [busca]);

  // Busca por telefone que não achou nada entre as recentes: procura no histórico.
  const podeBuscarNoServidor = soDigitos(busca).length >= 4 && conversasFiltradas.length === 0 && doServidor === null;
  function buscarNoHistorico() {
    startBusca(async () => {
      const r = await buscarConversasAction(busca);
      if (r.success) setDoServidor(r.data);
      else setErroBusca(r.error);
    });
  }

  const lista = doServidor ?? conversasFiltradas;
  const contagem = (f: Filtro) => (f === "todos" ? null : filtrarConversas(conversas, f, "", usuarioId).length);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou telefone"
            className="h-9 rounded-lg bg-secondary/70 pl-9 pr-8 text-sm"
            aria-label="Buscar conversa por nome ou telefone"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 neotec-scroll-x" role="tablist" aria-label="Filtrar conversas">
          {FILTROS.map((f) => {
            const n = contagem(f.value);
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filtro === f.value}
                onClick={() => setFiltro(f.value)}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors",
                  filtro === f.value ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                {n != null && n > 0 && <span className={cn("tabular-nums", filtro === f.value ? "text-background/70" : "text-muted-foreground/80")}>{n}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <p>
            {conversas.length === 0
              ? "Nenhuma conversa ainda. Elas aparecem aqui quando o WhatsApp recebe a primeira mensagem."
              : "Nenhuma conversa com esse filtro ou busca entre as recentes."}
          </p>
          {podeBuscarNoServidor && (
            <button type="button" onClick={buscarNoHistorico} disabled={buscandoServidor} className="text-sm font-medium text-primary hover:underline disabled:opacity-60">
              {buscandoServidor ? "Buscando no histórico…" : "Buscar esse telefone em todo o histórico"}
            </button>
          )}
          {erroBusca && <p className="text-xs text-danger">{erroBusca}</p>}
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversas">
          {lista.map((conversa) => {
            const isActive = pathname === `/comunicacao/${conversa.id}`;
            const naoLida = conversa.nao_lidas > 0;
            const status = STATUS_LABEL[conversa.status];
            return (
              <li key={conversa.id}>
                <Link
                  href={`/comunicacao/${conversa.id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/70 px-3 py-3 transition-colors focus-visible:bg-secondary focus-visible:outline-none",
                    isActive ? "bg-accent" : "hover:bg-secondary/60"
                  )}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", conversa.cliente ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground")}>
                    {conversa.cliente ? getInitials(conversa.cliente.nome) : "#"}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", naoLida ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                        {nomeDaConversa(conversa)}
                      </span>
                      {conversa.ultima_mensagem_em && (
                        <time dateTime={conversa.ultima_mensagem_em} className={cn("shrink-0 text-[11px] tabular-nums", naoLida ? "font-medium text-primary" : "text-muted-foreground")}>
                          {formatHorarioCurto(conversa.ultima_mensagem_em)}
                        </time>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                        {!conversa.ia_pausada && conversa.status === "aberta" && <Bot className="h-3 w-3 shrink-0" aria-label="IA atendendo" />}
                        {status ? status : conversa.responsavel_id === usuarioId ? "Com você" : conversa.responsavel_id ? "Com a equipe" : conversa.cliente ? "Sem responsável" : "Contato sem cadastro"}
                      </span>
                      {naoLida && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground" aria-label={`${conversa.nao_lidas} não lida(s)`}>
                          {conversa.nao_lidas}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
