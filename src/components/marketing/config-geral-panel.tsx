"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { atualizarConfigMarketingAction } from "@/services/marketing/marketing.actions";
import type { ConfigMarketingLoja } from "@/types";

export function ConfigGeralPanel({ config }: { config: ConfigMarketingLoja }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contadorAtivo, setContadorAtivo] = useState(config.contador_vendas_ativo);

  function salvar(input: Partial<Pick<ConfigMarketingLoja, "pix_desconto_percentual" | "estoque_baixo_limite" | "contador_vendas_ativo">>) {
    startTransition(async () => {
      await atualizarConfigMarketingAction(input);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Configuração geral</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Desconto no Pix (%)</label>
          <Input
            type="number" step="0.1" min={0} max={100} defaultValue={config.pix_desconto_percentual}
            onBlur={(e) => salvar({ pix_desconto_percentual: Number(e.target.value) || 0 })}
            className="w-40"
          />
          <p className="text-[11px] text-muted-foreground">0 = não mostra nenhum aviso de desconto Pix na loja.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Estoque baixo a partir de quantas unidades</label>
          <Input
            type="number" min={1} defaultValue={config.estoque_baixo_limite}
            onBlur={(e) => salvar({ estoque_baixo_limite: Number(e.target.value) || 1 })}
            className="w-40"
          />
          <p className="text-[11px] text-muted-foreground">Ex: 3 → mostra "Restam X unidades" quando tiver 3 ou menos de verdade em estoque.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox" checked={contadorAtivo} disabled={isPending}
            onChange={(e) => { setContadorAtivo(e.target.checked); salvar({ contador_vendas_ativo: e.target.checked }); }}
            className="h-4 w-4 accent-primary"
          />
          Mostrar contador de vendas reais no produto
        </label>
      </CardContent>
    </Card>
  );
}
