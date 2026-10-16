"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Telas que no celular ocupam a tela toda (como uma conversa no WhatsApp). */
export function ehTelaCheiaNoCelular(pathname: string): boolean {
  return /^\/comunicacao\/[^/]+$/.test(pathname) || pathname.startsWith("/celular/captura/");
}

/** Esconde o topo e a barra inferior do sistema no celular nessas telas (no computador nada muda). */
export function OcultarEmTelaCheia({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!ehTelaCheiaNoCelular(pathname)) return <>{children}</>;
  return <div className="contents max-md:hidden">{children}</div>;
}
