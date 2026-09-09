"use client";

import { useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { atualizarStatusOSAction } from "@/services/assistencia/assistencia.actions";
import { STATUS_OS_OPTIONS, toneDoStatusOS } from "@/utils/status-os";
import type { StatusOS } from "@/types";

export function StatusOSControl({ osId, statusAtual }: { osId: string; statusAtual: StatusOS }) {
  const [isPending, startTransition] = useTransition();
  const atual = STATUS_OS_OPTIONS.find((s) => s.value === statusAtual);

  function handleChange(status: string) {
    startTransition(() => {
      void atualizarStatusOSAction(osId, status as StatusOS);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Select defaultValue={statusAtual} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {atual && statusAtual !== "entregue" && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          Próximo passo: {atual.descricaoProximoPasso}
        </span>
      )}
    </div>
  );
}

/** Badge simples de status, usado em listagens (sem controle de troca). */
export function StatusOSBadge({ status }: { status: StatusOS }) {
  const config = STATUS_OS_OPTIONS.find((s) => s.value === status);
  return <StatusBadge label={config?.label ?? status} tone={toneDoStatusOS(status)} />;
}
