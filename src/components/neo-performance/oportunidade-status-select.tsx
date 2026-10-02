"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { atualizarStatusOportunidadeAction } from "@/services/neo-performance/neo-performance-avancado.actions";
import type { StatusOportunidade } from "@/types";

const OPCOES: StatusOportunidade[] = ["descoberta", "analisando", "aprovada", "testando", "validada", "descartada"];

export function OportunidadeStatusSelect({ id, statusAtual }: { id: string; statusAtual: StatusOportunidade }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={statusAtual}
      disabled={isPending}
      onValueChange={(valor) => startTransition(() => { void atualizarStatusOportunidadeAction(id, valor as StatusOportunidade); })}
    >
      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {OPCOES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
