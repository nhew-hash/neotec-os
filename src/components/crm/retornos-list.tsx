"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { concluirRetornoAction } from "@/services/crm/crm.actions";
import { formatDateTime, formatWhatsapp } from "@/utils";
import type { RetornoComCliente } from "@/services/crm/crm.service";

export function RetornosList({ retornos }: { retornos: RetornoComCliente[] }) {
  const [isPending, startTransition] = useTransition();

  if (retornos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Nenhum retorno pendente. Bom sinal — ou hora de criar um novo.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {retornos.map((retorno) => (
        <div
          key={retorno.id}
          className="flex items-center justify-between rounded-md border border-border bg-card p-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{retorno.cliente.nome}</span>
            <span className="text-xs text-muted-foreground">{retorno.motivo}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatDateTime(retorno.data_retorno)} · {formatWhatsapp(retorno.cliente.whatsapp)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => concluirRetornoAction(retorno.id))}
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir
          </Button>
        </div>
      ))}
    </div>
  );
}
