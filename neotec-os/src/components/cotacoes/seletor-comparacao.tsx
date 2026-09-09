"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/utils";
import type { Cotacao } from "@/types";

export function SeletorComparacao({
  cotacoes, selecionadoA, selecionadoB,
}: {
  cotacoes: Cotacao[];
  selecionadoA?: string;
  selecionadoB?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function atualizar(campo: "a" | "b", valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(campo, valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  function rotulo(c: Cotacao) {
    return `${c.fornecedor} — ${formatDate(c.data_cotacao)} (${c.categoria})`;
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Cotação A (referência)</label>
          <Select value={selecionadoA} onValueChange={(v) => atualizar("a", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {cotacoes.map((c) => <SelectItem key={c.id} value={c.id}>{rotulo(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Cotação B (comparar contra)</label>
          <Select value={selecionadoB} onValueChange={(v) => atualizar("b", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {cotacoes.map((c) => <SelectItem key={c.id} value={c.id}>{rotulo(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
