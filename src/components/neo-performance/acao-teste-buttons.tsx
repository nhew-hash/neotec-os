"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { iniciarTesteAction, avaliarTesteAction } from "@/services/neo-performance/neo-performance-avancado.actions";
import type { StatusTesteLab } from "@/types";

export function AcaoTesteButtons({ id, status }: { id: string; status: StatusTesteLab }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function rodar(fn: () => Promise<{ success: boolean; error?: string }>) {
    setErro(null);
    startTransition(async () => {
      const resultado = await fn();
      if (!resultado.success) setErro(resultado.error ?? "Erro");
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {status === "planejado" && (
        <Button size="sm" variant="outline" onClick={() => rodar(() => iniciarTesteAction(id))} disabled={isPending}>Iniciar teste</Button>
      )}
      {(status === "rodando" || status === "dados_insuficientes") && (
        <Button size="sm" variant="outline" onClick={() => rodar(() => avaliarTesteAction(id))} disabled={isPending}>Avaliar agora</Button>
      )}
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
