"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Copy, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { arquivarCotacaoAction, ativarCotacaoAction, duplicarCotacaoAction } from "@/services/cotacoes/cotacoes.actions";
import { formatDateTime } from "@/utils";
import type { Cotacao } from "@/types";

export function CotacaoCard({ cotacao }: { cotacao: Cotacao }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleArquivar() {
    startTransition(() => { void arquivarCotacaoAction(cotacao.id); });
  }
  function handleAtivar() {
    startTransition(() => { void ativarCotacaoAction(cotacao.id); });
  }
  function handleDuplicar() {
    startTransition(async () => {
      const result = await duplicarCotacaoAction(cotacao.id);
      if (result.success) router.push(`/cotacoes/${result.data.id}`);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/cotacoes/${cotacao.id}`} className="font-medium text-foreground hover:underline">
            {cotacao.fornecedor}
          </Link>
          {cotacao.status === "arquivada" && <Badge variant="secondary">Arquivada</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {cotacao.categoria} · {formatDateTime(cotacao.data_cotacao)} · {cotacao.quantidade_aparelhos} aparelho(s)
        </p>
        {cotacao.observacao && <p className="text-xs text-muted-foreground">{cotacao.observacao}</p>}

        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleDuplicar} disabled={isPending}>
            <Copy className="h-3.5 w-3.5" />Duplicar
          </Button>
          {cotacao.status === "ativa" ? (
            <Button variant="outline" size="sm" onClick={handleArquivar} disabled={isPending}>
              <Archive className="h-3.5 w-3.5" />Arquivar
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleAtivar} disabled={isPending}>
              <RotateCcw className="h-3.5 w-3.5" />Reativar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
