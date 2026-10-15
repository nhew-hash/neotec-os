"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { hrefAtivo, navPrincipal, navSecundaria, type SidebarNavItem } from "./nav-items";
import { useContagemNaoLidas } from "@/hooks/use-contagem-nao-lidas";
import type { CargoUsuario } from "@/types";

interface NavListProps {
  cargo: CargoUsuario;
  naoLidasInicial?: number;
  onNavigate?: () => void;
  /** Sidebar recolhida: só ícones, rótulo vira tooltip. */
  compacta?: boolean;
}

const CHAVE_GRUPOS = "neotec-nav-grupos-abertos";

function lerGruposAbertos(): string[] {
  try {
    const salvo = localStorage.getItem(CHAVE_GRUPOS);
    return salvo ? (JSON.parse(salvo) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Navegação do sistema (sidebar desktop e menu mobile).
 * - Pilares (Início, Comunicação, CRM, Central Comercial, Clientes) sempre
 *   visíveis no topo, com mais peso.
 * - Módulos secundários em grupos recolhíveis; o grupo da página atual abre
 *   sozinho e a escolha da pessoa fica salva neste navegador.
 * - Item ativo único (href mais específico) e `aria-current`.
 */
export function NavList({ cargo, naoLidasInicial = 0, onNavigate, compacta = false }: NavListProps) {
  const pathname = usePathname();
  const naoLidas = useContagemNaoLidas(naoLidasInicial);

  const principal = navPrincipal.filter((i) => i.cargos.includes(cargo));
  const grupos = useMemo(
    () => navSecundaria.map((g) => ({ ...g, items: g.items.filter((i) => i.cargos.includes(cargo)) })).filter((g) => g.items.length > 0),
    [cargo]
  );
  const ativo = hrefAtivo(pathname, [...principal, ...grupos.flatMap((g) => g.items)]);

  const [abertos, setAbertos] = useState<string[]>([]);
  useEffect(() => setAbertos(lerGruposAbertos()), []);

  function alternarGrupo(id: string) {
    setAbertos((atual) => {
      const novo = atual.includes(id) ? atual.filter((g) => g !== id) : [...atual, id];
      try { localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(novo)); } catch { /* armazenamento indisponível: só não lembra */ }
      return novo;
    });
  }

  function renderItem(item: SidebarNavItem, destaque: boolean) {
    const isActive = ativo === item.href;
    const Icon = item.icon;
    const badge = item.href === "/comunicacao" ? naoLidas : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        title={compacta ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compacta ? "h-10 justify-center px-0" : destaque ? "h-9 px-2.5" : "h-8 px-2.5",
          isActive
            ? "bg-nav-active font-medium text-nav-active-foreground shadow-[0_1px_2px_rgba(20,20,24,0.06),0_0_0_0.5px_rgba(20,20,24,0.06)]"
            : cn("text-nav-foreground hover:bg-nav-hover", destaque ? "font-medium" : "font-normal")
        )}
      >
        <Icon className={cn("shrink-0", destaque ? "h-[18px] w-[18px]" : "h-4 w-4", isActive ? "text-primary" : "text-nav-muted group-hover:text-nav-foreground")} aria-hidden />
        {!compacta && <span className="flex-1 truncate">{item.label}</span>}
        {badge > 0 && (
          <span
            className={cn(
              "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground",
              compacta && "absolute right-1 top-1"
            )}
            aria-label={`${badge} conversa(s) não lida(s)`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-0.5">{principal.map((item) => renderItem(item, true))}</div>

      {grupos.map((grupo) => {
        const contemAtivo = grupo.items.some((i) => i.href === ativo);
        const aberto = compacta || contemAtivo || abertos.includes(grupo.id);
        return (
          <div key={grupo.id} className="flex flex-col gap-0.5">
            {compacta ? (
              <div className="mx-auto my-1 h-px w-6 bg-nav-border" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={() => alternarGrupo(grupo.id)}
                aria-expanded={aberto}
                className="flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium uppercase tracking-wide text-nav-muted transition-colors hover:text-nav-foreground"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", aberto && "rotate-90")} aria-hidden />
                {grupo.label}
              </button>
            )}
            {aberto && grupo.items.map((item) => renderItem(item, false))}
          </div>
        );
      })}
    </nav>
  );
}
