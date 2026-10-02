"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rodarDiagnosticoAction } from "@/services/neo-performance/neo-performance.actions";

export function RodarDiagnosticoButton() {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleClick() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await rodarDiagnosticoAction();
      setMensagem(resultado.success ? `${resultado.data.gerados} diagnóstico(s) novo(s).` : resultado.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {mensagem && <span className="text-xs text-muted-foreground">{mensagem}</span>}
      <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Analisando..." : "Rodar diagnóstico"}
      </Button>
    </div>
  );
}
