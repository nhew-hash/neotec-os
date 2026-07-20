import { NavList } from "./nav-list";
import type { CargoUsuario } from "@/types";

/**
 * Sidebar fixa (desktop/tablet). Em telas pequenas fica oculta — o
 * MobileNav (Sheet) assume a navegação nesse breakpoint.
 */
export function Sidebar({ cargo, naoLidasInicial }: { cargo: CargoUsuario; naoLidasInicial: number }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-white">
          N
        </div>
        <span className="font-display text-[15px] font-semibold text-white">Neotec OS</span>
      </div>

      <NavList cargo={cargo} naoLidasInicial={naoLidasInicial} />

      <div className="mt-auto p-4">
        <p className="px-1 text-[11px] text-sidebar-muted">Neotec Araguari · v1.0.0</p>
      </div>
    </aside>
  );
}
