"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { atualizarRegraFreteAction } from "@/services/loja-admin/central-loja.actions";
import type { RegraFrete } from "@/types";

export function FretesPanel({ regras }: { regras: RegraFrete[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function salvar(id: string, input: { valor?: number; prazo_dias_uteis?: number; ativo?: boolean }) {
    startTransition(async () => {
      await atualizarRegraFreteAction(id, input);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {regras.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="w-32 text-sm font-medium text-foreground">{r.regiao}</span>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Valor do frete</label>
              <Input type="number" step="0.01" defaultValue={r.valor} onBlur={(e) => salvar(r.id, { valor: Number(e.target.value) || 0 })} className="h-8 w-28 text-xs" disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Prazo (dias úteis)</label>
              <Input type="number" defaultValue={r.prazo_dias_uteis} onBlur={(e) => salvar(r.id, { prazo_dias_uteis: Number(e.target.value) || 1 })} className="h-8 w-24 text-xs" disabled={isPending} />
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={r.ativo} onChange={(e) => salvar(r.id, { ativo: e.target.checked })} className="accent-primary" disabled={isPending} />
              Ativo
            </label>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">Valor 0 = frete grátis. Essas duas regiões já vêm com frete grátis em 1 dia útil, como combinado.</p>
    </div>
  );
}
