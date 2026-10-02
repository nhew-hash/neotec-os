"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { alternarRegraAction, backtestRegraAction } from "@/services/neo-performance/neo-performance-avancado.actions";
import type { AutomationRegra } from "@/types";

export function RegraAcoesButtons({ id, ativa, regra }: { id: string; ativa: boolean; regra: Pick<AutomationRegra, "nome" | "condicoes" | "acao"> }) {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<string | null>(null);

  function handleBacktest() {
    setResultado(null);
    startTransition(async () => {
      const r = await backtestRegraAction(regra, 30);
      if (!r.success) { setResultado(r.error); return; }
      const total = r.data.campanhasAfetadas.length;
      setResultado(total === 0 ? "Nenhuma campanha teria sido afetada nos últimos 30 dias." : `${total} campanha(s) teriam sido afetadas (ver detalhe no console/relatório).`);
    });
  }

  return (
    <div className="flex items-center gap-3">
      {resultado && <span className="max-w-xs text-right text-xs text-muted-foreground">{resultado}</span>}
      <Button size="sm" variant="ghost" onClick={handleBacktest} disabled={isPending}>Backtest 30d</Button>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <Checkbox checked={ativa} disabled={isPending} onCheckedChange={(checked) => startTransition(() => { void alternarRegraAction(id, checked === true); })} />
        Ativa
      </label>
    </div>
  );
}
