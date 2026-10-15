"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavList } from "./nav-list";
import { Marca } from "./marca";
import type { CargoUsuario } from "@/types";

/** Navegação para telas pequenas — abre a mesma NavList dentro de um Sheet. */
export function MobileNav({ cargo, naoLidasInicial }: { cargo: CargoUsuario; naoLidasInicial: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col bg-nav p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-14 items-center border-b border-nav-border px-4">
          <Marca />
        </div>
        <NavList cargo={cargo} naoLidasInicial={naoLidasInicial} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
