"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_LABEL, STATUS_TONE } from "./status";
import type { AvaliacaoTradeIn } from "@/services/trade-in/aplicacao.service";
import { formatCurrency } from "@/utils";

export function AvaliacoesLista({ avaliacoes }: { avaliacoes: AvaliacaoTradeIn[] }) {
  if (avaliacoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma avaliação de troca ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {avaliacoes.map((a) => (
        <Link key={a.id} href={`/trade-in/${a.id}`}>
          <Card className="transition-colors hover:bg-secondary/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{a.modelo_nome}</p>
                <p className="text-xs text-muted-foreground">
                  {a.cliente_nome ?? "Cliente não identificado"} — {new Date(a.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(a.valor_aprovado ?? a.valor_calculado)}
                </span>
                <StatusBadge label={STATUS_LABEL[a.status]} tone={STATUS_TONE[a.status]} />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
