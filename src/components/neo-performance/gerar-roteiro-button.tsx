"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { gerarRoteiroECopyAction } from "@/services/neo-performance/neo-performance-avancado.actions";

export function GerarRoteiroButton({ briefId }: { briefId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      const resultado = await gerarRoteiroECopyAction(briefId);
      if (!resultado.success) setErro(resultado.error);
    });
  }

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Gerando com o Claude..." : "Gerar roteiro e copy (IA)"}
      </Button>
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}
