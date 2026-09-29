"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Accordion({ itens }: { itens: { titulo: string; conteudo: string }[] }) {
  const [abertoIndex, setAbertoIndex] = useState<number | null>(0);

  if (itens.length === 0) return null;

  return (
    <div className="flex flex-col divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06]">
      {itens.map((item, i) => {
        const aberto = abertoIndex === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setAbertoIndex(aberto ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-medium text-foreground"
            >
              {item.titulo}
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
            </button>
            {aberto && <p className="px-4 pb-4 text-sm text-muted-foreground">{item.conteudo}</p>}
          </div>
        );
      })}
    </div>
  );
}
