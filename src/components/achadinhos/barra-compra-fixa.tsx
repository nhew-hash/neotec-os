"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoComprar } from "./botao-comprar";

interface Props {
  slug: string;
  pagina: string;
  nome: string;
  precoTexto: string | null;
  /** id do botão principal: a barra só aparece depois que ele sai da tela. */
  idBotaoPrincipal: string;
}

/** Barra de compra fixa no rodapé do celular — aparece só depois que o botão principal rolou pra fora da tela. */
export function BarraCompraFixa({ slug, pagina, nome, precoTexto, idBotaoPrincipal }: Props) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const alvo = document.getElementById(idBotaoPrincipal);
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setVisivel(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [idBotaoPrincipal]);

  return (
    <div
      aria-hidden={!visivel}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-achados-line bg-white/95 px-4 pt-3 backdrop-blur-md transition-transform motion-safe:duration-200 md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        visivel ? "translate-y-0" : "pointer-events-none translate-y-full"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-achados-muted">{nome}</p>
          {precoTexto && <p className="text-lg font-extrabold tabular-nums leading-tight text-achados-navy">{precoTexto}</p>}
        </div>
        <BotaoComprar
          slug={slug}
          pagina={pagina}
          origemClique="pdp_fixo"
          rotulo="Comprar pelo Mercado Livre"
          className="h-12 shrink-0 px-4 text-sm"
        />
      </div>
    </div>
  );
}
