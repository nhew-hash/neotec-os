"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sidebarNavGroups } from "./nav-items";
import { useContagemNaoLidas } from "@/hooks/use-contagem-nao-lidas";
import type { CargoUsuario } from "@/types";

interface NavListProps {
  cargo: CargoUsuario;
  naoLidasInicial?: number;
  onNavigate?: () => void;
}

/**
 * Lista de navegação reutilizada pela sidebar desktop e pelo menu mobile
 * (Sheet), evitando duplicar a marcação em dois componentes. Agrupada
 * por área de uso e filtrada por cargo — cada grupo só aparece se sobrar
 * pelo menos um item visível para o cargo atual.
 */
export function NavList({ cargo, naoLidasInicial = 0, onNavigate }: NavListProps) {
  const pathname = usePathname();
  const naoLidas = useContagemNaoLidas(naoLidasInicial);

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
      {sidebarNavGroups.map((group) => {
        const itensVisiveis = group.items.filter((item) => item.cargos.includes(cargo));
        if (itensVisiveis.length === 0) return null;

        return (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {group.label}
            </span>
            {itensVisiveis.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const badge = item.href === "/comunicacao" ? naoLidas : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-foreground hover:translate-x-0.5 hover:bg-sidebar-hover hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-cold transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-200", isActive && "scale-110")} />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
