"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { bottomNavItems } from "./nav-items";
import type { CargoUsuario } from "@/types";

/**
 * Barra de navegação inferior fixa — visível só em telas pequenas
 * (md:hidden). Filtrada por cargo, igual à sidebar — mesmo princípio de
 * não mostrar destino que o cargo não usa de verdade.
 */
export function BottomNav({ cargo }: { cargo: CargoUsuario }) {
  const pathname = usePathname();
  const itens = bottomNavItems.filter((item) => item.cargos.includes(cargo));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-card md:hidden">
      {itens.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
