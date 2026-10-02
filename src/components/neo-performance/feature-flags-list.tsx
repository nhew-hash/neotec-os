"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { alternarFlagAction } from "@/services/neo-performance/neo-performance.actions";
import type { FeatureFlag } from "@/types";

export function FeatureFlagsList({ flags }: { flags: FeatureFlag[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {flags.map((flag) => (
        <label key={flag.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Checkbox
            checked={flag.ativo}
            disabled={isPending}
            onCheckedChange={(checked) => startTransition(() => { void alternarFlagAction(flag.chave, checked === true); })}
          />
          <div>
            <p className="font-medium text-foreground">{flag.chave}</p>
            {flag.descricao && <p className="text-xs text-muted-foreground">{flag.descricao}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}
