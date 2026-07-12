"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Em celular, mostra a lista OU o chat (nunca os dois — não caberia).
 * Em desktop, mostra os dois lado a lado, como o WhatsApp Web.
 * A decisão de qual mostrar no mobile é só "tem :id na URL ou não" —
 * não precisa de estado, só de olhar a rota atual.
 */
export function ComunicacaoShell({ lista, children }: { lista: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const conversaAberta = pathname !== "/comunicacao";

  return (
    <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-card border border-border md:h-[calc(100vh-7.5rem)]">
      <div className={cn("flex w-full flex-col border-r border-border md:w-80", conversaAberta && "hidden md:flex")}>
        {lista}
      </div>
      <div className={cn("flex-col", conversaAberta ? "flex flex-1" : "hidden flex-1 md:flex")}>
        {children}
      </div>
    </div>
  );
}
