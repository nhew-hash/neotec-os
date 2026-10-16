"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hrefAtivo, itensBarraInferior, ROTULO_CURTO } from "./nav-items";
import { useContagemNaoLidas } from "@/hooks/use-contagem-nao-lidas";
import type { CargoUsuario } from "@/types";

/**
 * Barra inferior fixa (só celular). Os pilares que o cargo usa, completados
 * pelos destinos mais frequentes dele (técnico vê OS/Estoque). Conversas
 * mostra o contador de não lidas, igual à sidebar.
 */
export function BottomNav({ cargo, naoLidasInicial = 0 }: { cargo: CargoUsuario; naoLidasInicial?: number }) {
  const pathname = usePathname();
  const itens = itensBarraInferior(cargo);
  const ativo = hrefAtivo(pathname, itens);
  const naoLidas = useContagemNaoLidas(naoLidasInicial);

  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {itens.map((item) => {
        const isActive = ativo === item.href;
        const Icon = item.icon;
        const badge = item.href === "/comunicacao" ? naoLidas : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden />
              {badge > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            {ROTULO_CURTO[item.href] ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
