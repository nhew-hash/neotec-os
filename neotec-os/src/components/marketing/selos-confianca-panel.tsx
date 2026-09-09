"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atualizarSeloConfiancaAction } from "@/services/marketing/marketing.actions";
import type { SeloConfianca } from "@/types";

export function SelosConfiancaPanel({ selos }: { selos: SeloConfianca[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function alternar(id: string, ativo: boolean) {
    startTransition(async () => {
      await atualizarSeloConfiancaAction(id, ativo);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Selos de confiança</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="mb-2 text-xs text-muted-foreground">Aparecem numa faixa logo abaixo do botão "Adicionar ao carrinho" — escolha quais mostrar.</p>
        {selos.map((selo) => (
          <label key={selo.id} className="flex items-center gap-2 py-1.5 text-sm text-foreground">
            <input type="checkbox" checked={selo.ativo} disabled={isPending} onChange={(e) => alternar(selo.id, e.target.checked)} className="h-4 w-4 accent-primary" />
            {selo.label}
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
