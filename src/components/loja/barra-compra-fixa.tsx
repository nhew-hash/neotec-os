"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils";

/**
 * Envolve o botão principal de compra. No celular, quando ele sai da tela
 * (o cliente rolou para ler detalhes), aparece uma barra fixa embaixo com
 * nome, preço e "Comprar" — sem precisar voltar para cima.
 */
export function BarraCompraFixa({ nome, preco, rotulo = "Comprar", onComprar, children }: {
  nome: string;
  preco: number | null;
  rotulo?: string;
  onComprar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // Rolagem (não IntersectionObserver): um salto direto para baixo do botão,
    // sem ele nunca ter entrado na tela, não dispararia o observer.
    let quadro = 0;
    function verificar() {
      quadro = 0;
      const alvo = ref.current;
      if (alvo) setMostrar(alvo.getBoundingClientRect().bottom < 0);
    }
    function aoRolar() {
      if (!quadro) quadro = requestAnimationFrame(verificar);
    }
    verificar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <>
      <div ref={ref} className="flex flex-col">{children}</div>
      {preco != null && preco > 0 && (
        <div
          aria-hidden={!mostrar}
          className={`fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${
            mostrar ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{nome}</p>
              <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(preco)}</p>
            </div>
            <Button type="button" pill onClick={onComprar} tabIndex={mostrar ? 0 : -1} className="h-11 shrink-0 px-5 hover:bg-primary">
              <ShoppingBag className="h-4 w-4" />{rotulo}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
