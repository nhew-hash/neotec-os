"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { analisarFiadorAction } from "@/services/crediario/crediario.actions";

interface Fiador { id: string; status_analise: string }

export function FiadorAnalisePainel({ fiador }: { fiador: Fiador }) {
  const [isPending, startTransition] = useTransition();

  function handleAnalisar(resultado: "aprovado" | "reprovado") {
    const motivo = window.prompt(`Motivo:`);
    if (!motivo?.trim()) return;
    startTransition(() => { void analisarFiadorAction(fiador.id, resultado, motivo.trim()); });
  }

  if (fiador.status_analise !== "pendente") {
    return <p className="text-sm text-foreground">Status: {fiador.status_analise === "aprovado" ? "✅ Aprovado" : "❌ Reprovado"}</p>;
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Análise do fiador</h2>
      <div className="flex gap-2">
        <Button type="button" onClick={() => handleAnalisar("aprovado")} disabled={isPending}>Aprovar</Button>
        <Button type="button" variant="outline" onClick={() => handleAnalisar("reprovado")} disabled={isPending} className="text-danger">Reprovar</Button>
      </div>
    </div>
  );
}
