"use client";

import { usePathname } from "next/navigation";
import { hrefAtivo, todosOsItens } from "./nav-items";

/** Nome da seção atual no topo (substitui a saudação fixa, que se repetia em toda tela). */
export function TituloSecao({ saudacao }: { saudacao: string }) {
  const pathname = usePathname();
  const href = hrefAtivo(pathname);
  const item = href ? todosOsItens().find((i) => i.href === href) : null;
  // No Início a saudação já está no corpo da página — aqui fica só o nome da seção.
  if (!item) return <p className="truncate text-sm font-medium text-foreground">{saudacao}</p>;
  return <p className="truncate text-sm font-medium text-foreground">{item.label}</p>;
}
