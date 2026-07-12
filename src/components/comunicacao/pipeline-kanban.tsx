"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { moverCardEtapaAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatCurrency } from "@/utils";
import type { CrmEtapa } from "@/types";
import type { CardComRelacoes } from "@/services/crm-pipeline/crm-pipeline.service";

function CardItem({ card, etapas }: { card: CardComRelacoes; etapas: CrmEtapa[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-card">
      <Link href={`/clientes/${card.cliente.id}`} className="text-sm font-medium text-foreground hover:underline">
        {card.cliente.nome}
      </Link>
      <p className="line-clamp-2 text-xs text-muted-foreground">{card.titulo}</p>

      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" style={{ color: tag.cor }}>{tag.nome}</Badge>
          ))}
        </div>
      )}

      {card.valor_estimado != null && <span className="text-xs font-medium text-foreground">{formatCurrency(card.valor_estimado)}</span>}

      <Select
        defaultValue={card.etapa_id}
        disabled={isPending}
        onValueChange={(etapaId) => startTransition(() => moverCardEtapaAction(card.id, etapaId))}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {etapas.map((etapa) => <SelectItem key={etapa.id} value={etapa.id}>{etapa.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PipelineKanban({ etapas, cards }: { etapas: CrmEtapa[]; cards: CardComRelacoes[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {etapas.map((etapa) => {
        const itens = cards.filter((c) => c.etapa_id === etapa.id);
        return (
          <div key={etapa.id} className="flex w-60 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                {etapa.nome}
              </h3>
              <span className="text-xs text-muted-foreground">{itens.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {itens.map((card) => <CardItem key={card.id} card={card} etapas={etapas} />)}
              {itens.length === 0 && (
                <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Vazio</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
