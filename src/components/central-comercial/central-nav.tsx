"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navegação ÚNICA da Central comercial (uma só instância, sem duplicar desktop/mobile):
 * no desktop é uma faixa de abas com o CTA à direita; no celular, as abas rolam na horizontal
 * e o CTA vira um botão flutuante acima da barra inferior do sistema (alcance do polegar).
 */
export function CentralNav({ mostrarGerente }: { mostrarGerente: boolean }) {
  const path = usePathname();
  const abas = [
    { href: "/central-comercial", label: "Minha rotina", Icon: Home, ativo: path === "/central-comercial" },
    { href: "/central-comercial/propostas", label: "Propostas", Icon: FileText, ativo: path.startsWith("/central-comercial/propostas") },
    ...(mostrarGerente ? [{ href: "/central-comercial/gerente", label: "Gerência", Icon: ShieldCheck, ativo: path.startsWith("/central-comercial/gerente") }] : []),
  ];
  const naProposta = path.startsWith("/central-comercial/proposta") && !path.startsWith("/central-comercial/propostas");
  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-border bg-app/90 px-4 backdrop-blur md:-mx-8 md:px-8">
        <nav aria-label="Central comercial" className="flex flex-1 gap-1 overflow-x-auto">
          {abas.map(({ href, label, Icon, ativo }) => (
            <Link key={href} href={href} aria-current={ativo ? "page" : undefined}
              className={cn("flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
                ativo ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        {!naProposta && (
          <Link href="/central-comercial/proposta" className="hidden h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex">
            <Plus className="h-4 w-4" aria-hidden /> Nova proposta
          </Link>
        )}
      </div>
      {!naProposta && (
        <Link href="/central-comercial/proposta" aria-label="Nova proposta"
          className="fixed bottom-20 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden">
          <Plus className="h-5 w-5" aria-hidden /> Nova proposta
        </Link>
      )}
    </>
  );
}
