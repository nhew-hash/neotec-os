"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { pararAutomacoesAction, religarAutomacoesAction } from "@/services/neo-performance/neo-performance-avancado.actions";

export function KillSwitchPanel({ pausado }: { pausado: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      const resultado = pausado ? await religarAutomacoesAction() : await pararAutomacoesAction();
      if (!resultado.success) setErro(resultado.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {erro && <span className="text-xs text-danger">{erro}</span>}
      <Button variant={pausado ? "default" : "destructive"} size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "..." : pausado ? "Religar automações" : "PARAR AUTOMAÇÕES"}
      </Button>
    </div>
  );
}
