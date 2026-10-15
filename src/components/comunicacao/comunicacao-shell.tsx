"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Em celular, mostra a lista OU o chat (nunca os dois — não caberia).
 * Em desktop, lado a lado. A decisão é só "tem :id na URL ou não".
 * Altura = viewport menos o topo (3.5rem) e, no celular, a barra inferior (4rem).
 */
export function ComunicacaoShell({ lista, children }: { lista: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const conversaAberta = pathname !== "/comunicacao";

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] overflow-hidden bg-card md:h-[calc(100dvh-3.5rem)]">
      <div className={cn("flex w-full min-w-0 flex-col border-r border-border md:w-[340px] md:shrink-0", conversaAberta && "hidden md:flex")}>
        {lista}
      </div>
      <div className={cn("min-w-0 flex-col bg-app", conversaAberta ? "flex flex-1" : "hidden flex-1 md:flex")}>
        {children}
      </div>
    </div>
  );
}
