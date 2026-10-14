"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CentralNav({ mostrarGerente }: { mostrarGerente: boolean }) {
  const path = usePathname();
  const abas = [
    { href: "/central-comercial", label: "Minha rotina", ativo: path === "/central-comercial" },
    { href: "/central-comercial/proposta", label: "Proposta", ativo: path === "/central-comercial/proposta" },
    ...(mostrarGerente ? [{ href: "/central-comercial/gerente", label: "Gerência", ativo: path === "/central-comercial/gerente" }] : []),
  ];
  return (
    <nav aria-label="Central comercial" className="flex gap-1 overflow-x-auto border-b border-border">
      {abas.map((a) => (
        <Link key={a.href} href={a.href} aria-current={a.ativo ? "page" : undefined}
          className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors", a.ativo ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
