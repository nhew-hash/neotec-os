"use client";

import Link from "next/link";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIAS_LOJA } from "./categorias";
import { useCarrinho } from "./carrinho-context";

export function LojaHeader() {
  const { totalItens } = useCarrinho();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/loja" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-white">N</div>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">Neotec</span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {CATEGORIAS_LOJA.map((c) => (
              <Link key={c.valor} href={`/loja/categoria/${c.valor}`} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                {c.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/loja/carrinho" className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary">
            <ShoppingBag className="h-5 w-5 text-foreground" />
            {totalItens > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                {totalItens}
              </span>
            )}
          </Link>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary lg:hidden" onClick={() => setMenuAberto((v) => !v)}>
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuAberto && (
        <nav className="flex flex-col border-t border-black/[0.06] bg-white px-4 py-2 lg:hidden">
          {CATEGORIAS_LOJA.map((c) => (
            <Link key={c.valor} href={`/loja/categoria/${c.valor}`} className="py-2.5 text-sm font-medium text-foreground" onClick={() => setMenuAberto(false)}>
              {c.emoji} {c.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
