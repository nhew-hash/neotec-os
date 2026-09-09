"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { alternarAssinaturaDigitalAction } from "@/services/impressao/assinatura.actions";

export function ToggleAssinaturaDigital({ habilitadaInicial }: { habilitadaInicial: boolean }) {
  const router = useRouter();
  const [habilitada, setHabilitada] = useState(habilitadaInicial);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const novoValor = !habilitada;
    setHabilitada(novoValor); // otimista
    startTransition(async () => {
      const result = await alternarAssinaturaDigitalAction(novoValor);
      if (!result.success) {
        setHabilitada(!novoValor); // desfaz se der erro
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Assinatura digital</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={habilitada} onChange={handleToggle} disabled={isPending} className="h-4 w-4 accent-primary" />
          Habilitar assinatura digital
        </label>
        <p className="text-xs text-muted-foreground">
          Quando ativado, aparece o botão de coletar assinatura (cliente e técnico) nas telas de OS e Venda —
          funciona com mouse, dedo (touch) ou caneta de tablet, sem precisar de nenhum hardware específico.
          A assinatura coletada aparece automaticamente no documento impresso.
        </p>
      </CardContent>
    </Card>
  );
}
