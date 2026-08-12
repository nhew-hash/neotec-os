"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Atualiza a página inteira a cada 30s — os cards de resumo, produtos
 * em destaque e origem de acesso são Server Components (buscam dado
 * fresco a cada render), então `router.refresh()` já resolve sem
 * precisar de estado próprio em cada componente. "Online agora" e
 * "Atividade recente" já tinham polling próprio mais rápido (15s/20s)
 * porque são os números que fazem mais sentido ver mudar na hora.
 */
export function AutoRefreshPainel({ intervaloMs = 30_000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(intervalo);
  }, [router, intervaloMs]);

  return null;
}
