"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reabrirAtendimentoOSAction } from "@/services/assistencia/assistencia.actions";

export function ReabrirAtendimentoButton({ osId }: { osId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);

  async function handleReabrir() {
    setReabrindo(true);
    await reabrirAtendimentoOSAction(osId);
    setReabrindo(false);
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Reabrir esse atendimento?</span>
        <Button type="button" size="sm" variant="outline" onClick={handleReabrir} disabled={reabrindo}>
          {reabrindo ? "Reabrindo..." : "Confirmar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)}>Cancelar</Button>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(true)} className="gap-1.5">
      <RotateCcw className="h-3.5 w-3.5" />Reabrir (garantia)
    </Button>
  );
}
