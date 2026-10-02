"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { definirModoAutonomiaAction } from "@/services/neo-performance/neo-performance-avancado.actions";
import type { ModoAutonomia } from "@/types";

const LABELS: Record<ModoAutonomia, string> = {
  observacao: "Observação (só analisa)",
  recomendacao: "Recomendação (analisa e sugere)",
  controlado: "Controlado (executa dentro das regras)",
  autonomo: "Autônomo (executa dentro dos limites)",
};

export function ModoAutonomiaSelect({ modoAtual }: { modoAtual: ModoAutonomia }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={modoAtual}
      disabled={isPending}
      onValueChange={(valor) => startTransition(() => { void definirModoAutonomiaAction(valor as ModoAutonomia); })}
    >
      <SelectTrigger className="h-9 w-64 text-sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        {Object.entries(LABELS).map(([valor, label]) => <SelectItem key={valor} value={valor}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
