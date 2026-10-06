"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AchadinhosAdminNav({ mostrarChaves }: { mostrarChaves: boolean }) {
  const path = usePathname();
  const abas = [
    { href: "/achadinhos-admin", label: "Produtos", ativo: /^\/achadinhos-admin(\/(?!novo|chaves|atividade)[^/]+)?$/.test(path) },
    { href: "/achadinhos-admin/novo", label: "Novo produto", ativo: path === "/achadinhos-admin/novo" },
    ...(mostrarChaves ? [{ href: "/achadinhos-admin/chaves", label: "Conexão com o Claude", ativo: path === "/achadinhos-admin/chaves" }] : []),
    { href: "/achadinhos-admin/atividade", label: "Atividade", ativo: path === "/achadinhos-admin/atividade" },
  ];
  return (
    <nav aria-label="Achadinhos" className="flex gap-1 overflow-x-auto border-b border-border">
      {abas.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={a.ativo ? "page" : undefined}
          className={cn(
            "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            a.ativo ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
