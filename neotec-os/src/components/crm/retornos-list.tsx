"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { concluirFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatDateTime } from "@/utils";
import type { CrmFollowup, CrmCard, Cliente } from "@/types";

type FollowupComRelacoes = CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> | null; cliente: Pick<Cliente, "id" | "nome"> | null };

/** Fase 179 — unificado com crm_followups (antes usava a tabela "retornos" à parte). */
export function RetornosList({ retornos }: { retornos: FollowupComRelacoes[] }) {
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
      {retornos.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-md border border-border bg-card p-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{item.cliente?.nome ?? item.card?.titulo ?? "Cliente"}</span>
            <span className="text-xs text-muted-foreground">{item.motivo}</span>
            <span className="font-mono text-xs text-muted-foreground">{formatDateTime(item.data_agendada)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => { void concluirFollowupAction(item.id); })}
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir
          </Button>
        </div>
      ))}
    </div>
  );
}
