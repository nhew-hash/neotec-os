"use client";

import { useState, useEffect } from "react";
import type { BarraTopoItem } from "@/types";

export function BarraTopoRotativa({ itens }: { itens: BarraTopoItem[] }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (itens.length < 2) return;
    const timer = setInterval(() => setIndice((i) => (i + 1) % itens.length), 3500);
    return () => clearInterval(timer);
  }, [itens.length]);

  if (itens.length === 0) return null;
  const item = itens[indice];

  return (
    <div className="flex h-9 items-center justify-center bg-[#0B0D12] px-4 text-center text-xs font-medium text-white">
      <span key={item.id} className="animate-fade-in">
        {item.icone} {item.texto}
      </span>
    </div>
  );
}
