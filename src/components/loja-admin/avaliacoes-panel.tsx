"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aprovarAvaliacaoAction, removerAvaliacaoAction } from "@/services/loja-admin/central-loja.actions";
import { formatDate } from "@/utils";
import type { AvaliacaoLoja } from "@/types";

export function AvaliacoesPanel({ avaliacoes }: { avaliacoes: AvaliacaoLoja[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {avaliacoes.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{a.nome_cliente}</span>
                {a.cidade && <span className="text-xs text-muted-foreground">— {a.cidade}</span>}
                <Badge variant={a.aprovado ? "success" : "secondary"}>{a.aprovado ? "Publicada" : "Aguardando aprovação"}</Badge>
              </div>
              <div className="mt-1 flex gap-0.5 text-warning">
                {Array.from({ length: a.nota }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
              </div>
              {a.comentario && <p className="mt-1 text-sm text-foreground">{a.comentario}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(a.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm" disabled={isPending}
                onClick={() => startTransition(async () => { await aprovarAvaliacaoAction(a.id, !a.aprovado); router.refresh(); })}
              >
                {a.aprovado ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {a.aprovado ? "Despublicar" : "Aprovar"}
              </Button>
              <Button variant="ghost" size="icon" disabled={isPending} onClick={() => startTransition(async () => { await removerAvaliacaoAction(a.id); router.refresh(); })}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {avaliacoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma avaliação recebida ainda.</p>}
    </div>
  );
}
