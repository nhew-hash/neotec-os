"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { atualizarStatusOSAction } from "@/services/assistencia/assistencia.actions";
import { formatCurrency, formatDate } from "@/utils";
import { STATUS_OS_OPTIONS } from "@/utils/status-os";
import type { StatusOS } from "@/types";
import type { OSComCliente } from "@/services/assistencia/assistencia.service";

export function OSCard({ os }: { os: OSComCliente }) {
  const [isPending, startTransition] = useTransition();
  const atrasada = os.prazo && new Date(os.prazo) < new Date() && os.status !== "entregue";

  function handleChangeStatus(status: string) {
    startTransition(() => {
      void atualizarStatusOSAction(os.id, status as StatusOS);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-card">
      <div className="flex items-start gap-2">
        {os.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={os.fotoUrl} alt="" className="h-10 w-10 shrink-0 rounded-md border border-border object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] text-muted-foreground">
            sem foto
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">{os.numero_os}</span>
            {os.urgente && <AlertCircle className="h-3.5 w-3.5 text-danger" />}
          </div>
          <Link href={`/assistencia/${os.id}`} className="truncate text-sm font-medium text-foreground hover:underline">
            {os.cliente.nome}
          </Link>
          {os.aparelho?.produto?.nome ? (
            <span className="truncate text-xs text-muted-foreground">{os.aparelho.produto.nome}</span>
          ) : os.aparelho_descricao ? (
            <span className="truncate text-xs text-muted-foreground">{os.aparelho_descricao}</span>
          ) : null}
        </div>
      </div>

      <p className="line-clamp-2 text-xs text-muted-foreground">{os.defeito}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        {os.valor != null && <Badge variant="secondary">{formatCurrency(os.valor)}</Badge>}
        {os.prazo && <Badge variant={atrasada ? "danger" : "secondary"}>{formatDate(os.prazo)}</Badge>}
      </div>

      <Select defaultValue={os.status} onValueChange={handleChangeStatus} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
