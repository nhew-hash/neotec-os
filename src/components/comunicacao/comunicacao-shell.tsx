"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Em celular, mostra a lista OU o chat (nunca os dois — não caberia).
 * Em desktop, lado a lado. A decisão é só "tem :id na URL ou não".
 * Altura = viewport menos o topo (3.5rem) e, no celular, a barra inferior (4rem).
 * Com a conversa aberta no celular, o topo e a barra somem (tela cheia, como no WhatsApp).
 */
export function ComunicacaoShell({ lista, children }: { lista: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const conversaAberta = pathname !== "/comunicacao";
  const altura = useAlturaVisivel(conversaAberta);

  return (
    <div
      className={cn("flex overflow-hidden bg-card md:!h-[calc(100dvh-3.5rem)]", conversaAberta ? "h-dvh" : "h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]")}
      style={altura ? { height: altura } : undefined}
    >
      <div className={cn("flex w-full min-w-0 flex-col border-r border-border md:w-[340px] md:shrink-0", conversaAberta && "hidden md:flex")}>
        {lista}
      </div>
      <div className={cn("min-w-0 flex-col bg-app", conversaAberta ? "flex flex-1" : "hidden flex-1 md:flex")}>
        {children}
      </div>
    </div>
  );
}

/**
 * iPhone: com o teclado aberto, o Safari empurra a página para cima e o
 * cabeçalho da conversa ia para trás do relógio (aparecia embaçado). Aqui a
 * conversa encolhe para a área visível acima do teclado e a página volta
 * para o topo — o cabeçalho fica sempre no lugar, como no WhatsApp.
 */
function useAlturaVisivel(ativo: boolean): number | null {
  const [altura, setAltura] = useState<number | null>(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!ativo || !vv || window.matchMedia("(min-width: 768px)").matches) { setAltura(null); return; }
    const ajustar = () => {
      // Só quando o teclado está tomando espaço; senão, a altura normal (100dvh) vale.
      const teclado = window.innerHeight - vv.height > 80;
      setAltura(teclado ? Math.round(vv.height) : null);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      const principal = document.getElementById("conteudo");
      if (principal && principal.scrollTop !== 0) principal.scrollTop = 0;
    };
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => { vv.removeEventListener("resize", ajustar); vv.removeEventListener("scroll", ajustar); };
  }, [ativo]);
  return altura;
}
