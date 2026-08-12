"use client";

import { useState, useEffect } from "react";
import { Radio } from "lucide-react";

/** Único card que atualiza sozinho a cada 15s — é o número que mais faz sentido ver "vivo". */
export function OnlineAgoraCard({ valorInicial }: { valorInicial: number }) {
  const [valor, setValor] = useState(valorInicial);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const { obterOnlineAgoraAction } = await import("@/services/analytics/loja-analytics.actions");
      const result = await obterOnlineAgoraAction();
      if (result.success) setValor(result.data);
    }, 15_000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-success/20 bg-success/5 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-success">Online agora</span>
      </div>
      <div className="flex items-center gap-2">
        <Radio className="h-6 w-6 text-success" />
        <span className="font-display text-3xl font-bold text-foreground">{valor}</span>
      </div>
    </div>
  );
}
