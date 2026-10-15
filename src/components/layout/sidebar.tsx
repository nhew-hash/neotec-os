"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavList } from "./nav-list";
import { Marca } from "./marca";
import type { CargoUsuario } from "@/types";

export const COOKIE_SIDEBAR = "neotec-sidebar";

/**
 * Sidebar fixa (desktop/tablet), recolhível. O estado fica num cookie lido
 * pelo layout no servidor — a página já nasce no tamanho certo, sem pular.
 * Em telas pequenas fica oculta: o MobileNav (Sheet) e a barra inferior
 * assumem a navegação.
 */
export function Sidebar({ cargo, naoLidasInicial, recolhidaInicial = false }: { cargo: CargoUsuario; naoLidasInicial: number; recolhidaInicial?: boolean }) {
  const [recolhida, setRecolhida] = useState(recolhidaInicial);

  function alternar() {
    const nova = !recolhida;
    setRecolhida(nova);
    document.cookie = `${COOKIE_SIDEBAR}=${nova ? "recolhida" : "aberta"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-nav-border bg-nav transition-[width] duration-200 md:flex",
        recolhida ? "w-[68px]" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-nav-border", recolhida ? "justify-center px-0" : "justify-between px-4")}>
        {!recolhida && <Marca />}
        <button
          type="button"
          onClick={alternar}
          className="flex h-8 w-8 items-center justify-center rounded-md text-nav-muted transition-colors hover:bg-nav-hover hover:text-nav-foreground"
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
        >
          {recolhida ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <NavList cargo={cargo} naoLidasInicial={naoLidasInicial} compacta={recolhida} />
    </aside>
  );
}
