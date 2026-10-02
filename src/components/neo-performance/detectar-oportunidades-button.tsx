"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { detectarOportunidadesAction } from "@/services/neo-performance/neo-performance-avancado.actions";

export function DetectarOportunidadesButton() {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleClick() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await detectarOportunidadesAction();
      setMensagem(resultado.success ? `${resultado.data.criadas} nova(s).` : resultado.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {mensagem && <span className="text-xs text-muted-foreground">{mensagem}</span>}
      <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>{isPending ? "Detectando..." : "Detectar oportunidades"}</Button>
    </div>
  );
}
